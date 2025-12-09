import { useCallback } from 'react';
import type { Action } from './state';

export function useSse(dispatch: React.Dispatch<Action>, actionMap: Record<string, string>) {
    const handleSseStream = useCallback(async (response: Response) => {
        if (!response.body) {
            throw new Error("Response has no body");
        }

        const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
        let finalState = null;

        try {
            while (true) {
                const { value, done } = await reader.read();
                if (done) {
                    console.log('SSE stream closed normally');
                    break;
                }
                
                if (!value) continue;

                const lines = value.trim().split('\n');
                for (const line of lines) {
                    if (line.startsWith('data:')) {
                        const jsonStr = line.substring(5).trim();
                        if (jsonStr) {
                            try {
                                const data = JSON.parse(jsonStr);
                                if (data.is_final) {
                                    finalState = data.result;
                                    continue;
                                }
                                const { type, payload } = data;
                                console.log('SSE event received:', type, payload);
                                switch (type) {
                                    case 'node_status':
                                        dispatch({ type: 'SET_NODE_STATUS', payload });
                                        if (payload.status === 'active') {
                                            console.log('Node active:', payload.node);
                                            dispatch({ type: 'SET_ACTIVE_NODE', payload: payload.node });
                                            const actionKey = payload.node as keyof typeof actionMap;
                                            if (actionMap[actionKey]) {
                                                dispatch({
                                                    type: 'ADD_ACTION_LOG',
                                                    payload: { key: actionKey, title: actionMap[actionKey], status: 'active', detailLogs: [] },
                                                });
                                            }
                                        } else if (payload.status === 'success' || payload.status === 'failure') {
                                            console.log('Node completed:', payload.node, payload.status);
                                            dispatch({
                                                type: 'UPDATE_ACTION_LOG',
                                                payload: { key: payload.node, status: payload.status },
                                            });
                                        }
                                        break;
                                    case 'log':
                                        dispatch({
                                            type: 'ADD_DETAIL_LOG',
                                            payload: { actionKey: payload.actionKey, log: payload.log },
                                        });
                                        break;
                                    case 'state':
                                        dispatch({ type: 'SET_GRAPH_STATE', payload });
                                        break;
                                    case 'control':
                                        if (payload.status === 'finished' || payload.status === 'paused' || payload.status === 'waiting_for_approval') {
                                            console.log(`Control message: ${payload.status} - setting isRunning to false`);
                                            dispatch({ type: 'SET_IS_RUNNING', payload: false });
                                            dispatch({ type: 'SET_ACTIVE_NODE', payload: null });
                                        }
                                        break;
                                    default:
                                        console.warn("Unknown event type:", type);
                                }
                            } catch (e) {
                                console.error("Failed to parse SSE data:", jsonStr, e);
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.error("SSE stream error:", error);
            throw error;
        } finally {
            // Clean up reader
            try {
                reader.releaseLock();
            } catch (e) {
                // Reader may already be closed
            }
        }
        
        if (finalState) {
            dispatch({ type: 'SET_GRAPH_STATE', payload: finalState });
        }
    }, [dispatch, actionMap]);

    return { handleSseStream };
}
