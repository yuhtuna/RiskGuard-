import type { HASTGraphState, NodeStatus, NodeKey, ActionLog } from '../../types';
import { WORKFLOW_NODES } from '../../constants';

export interface AppState {
    isRunning: boolean;
    activeNode: NodeKey | null;
    nodeStatuses: Record<NodeKey, NodeStatus>;
    graphState: Partial<HASTGraphState>;
    actionLogs: ActionLog[];
    isModalOpen: boolean;
    scanError: string | null;
    appliedFixes: string[];
    sessionId: string | null;
}

export const initialState: AppState = {
    isRunning: false,
    activeNode: null,
    nodeStatuses: Object.keys(WORKFLOW_NODES).reduce((acc, key) => ({ ...acc, [key]: 'pending' }), {} as Record<NodeKey, NodeStatus>),
    graphState: { final_report: null },
    actionLogs: [],
    isModalOpen: false,
    scanError: null,
    appliedFixes: [],
    sessionId: null,
};

export type Action =
    | { type: 'RESET_STATE' }
    | { type: 'SET_IS_RUNNING'; payload: boolean }
    | { type: 'SET_ACTIVE_NODE'; payload: NodeKey | null }
    | { type: 'SET_NODE_STATUS'; payload: { node: NodeKey; status: NodeStatus } }
    | { type: 'SET_GRAPH_STATE'; payload: Partial<HASTGraphState> }
    | { type: 'ADD_ACTION_LOG'; payload: Omit<ActionLog, 'id'> & { id?: string } }
    | { type: 'UPDATE_ACTION_LOG'; payload: { key: NodeKey | string; status: NodeStatus } }
    | { type: 'ADD_DETAIL_LOG'; payload: { actionKey: NodeKey | string; log: any } }
    | { type: 'SET_IS_MODAL_OPEN'; payload: boolean }
    | { type: 'SET_SCAN_ERROR'; payload: string | null }
    | { type: 'ADD_APPLIED_FIX'; payload: string }
    | { type: 'SET_SESSION_ID'; payload: string };

export function reducer(state: AppState, action: Action): AppState {
    switch (action.type) {
        case 'RESET_STATE':
            return initialState;
        case 'SET_IS_RUNNING':
            return { ...state, isRunning: action.payload };
        case 'SET_SESSION_ID':
            return { ...state, sessionId: action.payload };
        case 'SET_ACTIVE_NODE':
            return { ...state, activeNode: action.payload };
        case 'SET_NODE_STATUS':
            return {
                ...state,
                nodeStatuses: {
                    ...state.nodeStatuses,
                    [action.payload.node]: action.payload.status,
                },
            };
        case 'SET_GRAPH_STATE':
            return {
                ...state,
                graphState: {
                    ...state.graphState,
                    ...action.payload,
                },
            };
        case 'ADD_ACTION_LOG':
            return {
                ...state,
                actionLogs: [...state.actionLogs, { ...action.payload, id: action.payload.id || `log-${Date.now()}-${Math.random().toString(36).substring(2, 11)}` }],
            };
        case 'UPDATE_ACTION_LOG':
            return {
                ...state,
                actionLogs: state.actionLogs.map(log =>
                    log.key === action.payload.key
                        ? { ...log, status: action.payload.status }
                        : log
                ),
            };
        case 'ADD_DETAIL_LOG': {
            const { actionKey, log } = action.payload;
            const actionExists = state.actionLogs.some(a => a.key === actionKey);

            if (!actionExists && actionKey !== 'start') {
                return {
                    ...state,
                    actionLogs: [
                        ...state.actionLogs,
                        {
                            id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
                            key: actionKey,
                            title: 'General',
                            status: 'active',
                            detailLogs: [log],
                        },
                    ],
                };
            }

            return {
                ...state,
                actionLogs: state.actionLogs.map(action =>
                    action.key === actionKey
                        ? { ...action, detailLogs: [...action.detailLogs, log] }
                        : action
                ),
            };
        }
        case 'SET_IS_MODAL_OPEN':
            return { ...state, isModalOpen: action.payload };
        case 'SET_SCAN_ERROR':
            return { ...state, scanError: action.payload };
        case 'ADD_APPLIED_FIX':
            return {
                ...state,
                appliedFixes: [...state.appliedFixes, action.payload],
            };
        default:
            return state;
    }
}
