import React, { useReducer, useCallback, useRef, useEffect, useState } from 'react';
import type { HASTGraphState, NodeStatus, NodeKey, Theme, ActionLog } from '../../types';
import { WORKFLOW_NODES } from '../../constants';
import Header from './components/Header';
import ControlPanel from './components/ControlPanel';
import ScanProgress from './components/ScanProgress';
import ActivityLog from './components/ActivityLog';
import VulnerabilityReport from './components/VulnerabilityReport';
import FinalReportModal from './components/FinalReportModal';
import Welcome from './components/Welcome';
import { initialState, reducer } from './state';
import { useSse } from './useSse';

// Utility function to convert File to base64
const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const base64 = reader.result as string;
            // Remove the data:*/*;base64, prefix
            const base64Data = base64.split(',')[1];
            resolve(base64Data);
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
    });
};

const HomePage: React.FC = () => {
    const [state, dispatch] = useReducer(reducer, initialState);
    const {
        isRunning,
        activeNode,
        nodeStatuses,
        graphState,
        actionLogs,
        isModalOpen,
        scanError,
        appliedFixes,
    } = state;
    const [theme, setTheme] = useState<Theme>(() => {
        if (typeof window !== 'undefined' && window.localStorage) {
            const storedTheme = window.localStorage.getItem('theme') as Theme | null;
            if (storedTheme) return storedTheme;
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return 'dark';
    });
    const eventSourceRef = useRef<EventSource | null>(null);

    const actionMap = {
        'deploy_sandbox': 'Deploy Sandbox Environment',
        'redeploy_sandbox': 'Re-deploy Patched Code',
        'sast_scan': 'Run Static Code Analysis on Source Code',
        'plan_attack': 'Generate Dynamic Exploit Testing Attack Plan',
        'run_dast': 'Execute Dynamic Exploit Testing Exploits',
        'destroy_sandbox': 'Destroy Sandbox Environment'
    };

    const { handleSseStream } = useSse(dispatch, actionMap);

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    // Prevent unwanted page refresh during scan
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isRunning) {
                e.preventDefault();
                e.returnValue = '';
                return '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isRunning]);

    const toggleTheme = () => {
        setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
    };

    const resetState = useCallback(() => {
        console.log('Resetting state and cleaning up event source');
        if (eventSourceRef.current) {
            try {
                eventSourceRef.current.close();
            } catch (e) {
                console.error('Error closing event source:', e);
            } finally {
                eventSourceRef.current = null;
            }
        }
        dispatch({ type: 'RESET_STATE' });
    }, []);

    const handleStartScan = useCallback(async (file: File | null) => {
        if (!file) {
            dispatch({ type: 'SET_SCAN_ERROR', payload: 'No file selected.' });
            return;
        }
        resetState();
        dispatch({ type: 'SET_IS_RUNNING', payload: true });
        dispatch({
            type: 'ADD_ACTION_LOG',
            payload: {
                key: 'file_upload',
                title: 'Uploading and Verifying File',
                status: 'active',
                detailLogs: [{ message: `Uploading ${file.name}...`, type: 'info', timestamp: (Date.now() / 1000).toString() }],
            },
        });

        try {
            const base64File = await fileToBase64(file);
            const response = await fetch('http://127.0.0.1:8080/api/scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ zip_file_base64: base64File }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                const errorMessage = errorData.error || `HTTP error! status: ${response.status}`;
                dispatch({ type: 'SET_SCAN_ERROR', payload: errorMessage });
                dispatch({
                    type: 'UPDATE_ACTION_LOG',
                    payload: {
                        key: 'file_upload',
                        status: 'failure',
                    },
                });
                dispatch({
                    type: 'ADD_DETAIL_LOG',
                    payload: {
                        actionKey: 'file_upload',
                        log: { message: `Upload failed: ${errorMessage}`, type: 'failure', timestamp: (Date.now() / 1000).toString() },
                    },
                });
                dispatch({ type: 'SET_IS_RUNNING', payload: false });
                return;
            }

            dispatch({
                type: 'UPDATE_ACTION_LOG',
                payload: {
                    key: 'file_upload',
                    status: 'success',
                },
            });
            dispatch({
                type: 'ADD_DETAIL_LOG',
                payload: {
                    actionKey: 'file_upload',
                    log: { message: 'File uploaded and verified.', type: 'success', timestamp: (Date.now() / 1000).toString() },
                },
            });

            await handleSseStream(response);
            console.log('SSE stream handling completed successfully');
        } catch (error) {
            console.error('Error in handleStartScan:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            dispatch({ type: 'SET_SCAN_ERROR', payload: errorMessage });
            dispatch({
                type: 'UPDATE_ACTION_LOG',
                payload: {
                    key: 'file_upload',
                    status: 'failure',
                },
            });
            dispatch({
                type: 'ADD_DETAIL_LOG',
                payload: {
                    actionKey: 'file_upload',
                    log: { message: `Scan failed: ${errorMessage}`, type: 'failure', timestamp: (Date.now() / 1000).toString() },
                },
            });
            dispatch({ type: 'SET_IS_RUNNING', payload: false });
        } finally {
            console.log('handleStartScan finally block - ensuring isRunning is managed correctly');
        }
    }, [resetState, handleSseStream]);

    const handleApplyFix = useCallback(async (patch: string) => {
        try {
            const response = await fetch('http://127.0.0.1:8080/api/apply-fix', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ patch, graph_state: graphState }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to apply fix');
            }
            const newState = await response.json();
            dispatch({ type: 'SET_GRAPH_STATE', payload: newState });
            dispatch({ type: 'ADD_APPLIED_FIX', payload: patch });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            dispatch({ type: 'SET_SCAN_ERROR', payload: `Apply fix failed: ${errorMessage}` });
        }
    }, [graphState]);

    const handleRunDast = useCallback(async () => {
        try {
            dispatch({ type: 'SET_IS_RUNNING', payload: true });
            dispatch({ type: 'SET_SCAN_ERROR', payload: null });
            dispatch({
                type: 'ADD_ACTION_LOG',
                payload: {
                    key: 'continue_scan',
                    title: 'Continuing with DAST Scan',
                    status: 'active',
                    detailLogs: [{ message: 'Starting Dynamic Exploit Testing scan...', type: 'info', timestamp: (Date.now() / 1000).toString() }],
                },
            });
            
            const response = await fetch('http://127.0.0.1:8080/api/continue-scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ graph_state: graphState }),
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(errorData.error || 'Failed to start Dynamic Exploit Testing scan');
            }

            await handleSseStream(response);
        } catch (error) {
            console.error('DAST scan error:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            dispatch({ type: 'SET_SCAN_ERROR', payload: `Dynamic Exploit Testing scan failed to start: ${errorMessage}` });
            dispatch({ type: 'SET_IS_RUNNING', payload: false });
            dispatch({
                type: 'UPDATE_ACTION_LOG',
                payload: {
                    key: 'continue_scan',
                    status: 'failure',
                },
            });
        }
    }, [graphState, handleSseStream]);

    const handleRegenerateFixes = useCallback(async () => {
        try {
            dispatch({ type: 'SET_IS_RUNNING', payload: true });
            dispatch({ type: 'SET_SCAN_ERROR', payload: null });
            
            const response = await fetch('http://127.0.0.1:8080/api/regenerate-fixes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ graph_state: graphState }),
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(errorData.error || 'Failed to regenerate fixes');
            }

            await handleSseStream(response);
        } catch (error) {
            console.error('Regenerate fixes error:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            dispatch({ type: 'SET_SCAN_ERROR', payload: `Failed to regenerate fixes: ${errorMessage}` });
            dispatch({ type: 'SET_IS_RUNNING', payload: false });
        }
    }, [graphState, handleSseStream]);

    const handleFinish = useCallback(async () => {
        try {
            const downloadResponse = await fetch('http://127.0.0.1:8080/api/download', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ graph_state: graphState }),
            });

            if (!downloadResponse.ok) {
                const errorData = await downloadResponse.json();
                throw new Error(errorData.error || 'Failed to download fixed code');
            }

            const downloadData = await downloadResponse.json();
            const a = document.createElement('a');
            a.href = `data:application/zip;base64,${downloadData.data}`;
            a.download = 'fixed_source.zip';
            document.body.appendChild(a);
            a.click();
            a.remove();

            await fetch('http://127.0.0.1:8080/api/finish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ graph_state: graphState }),
            });

            resetState();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            dispatch({ type: 'SET_SCAN_ERROR', payload: `Finish process failed: ${errorMessage}` });
        }
    }, [graphState, resetState]);

    const dastReport = graphState.dast_report;
    const exploitSucceeded = dastReport?.vulnerabilities?.some((v) => v.status === 'SUCCESS') || false;

    // Show final report only if Dynamic Exploit Testing completed successfully (exploit failed = fix worked)
    const hasReport = !isRunning && graphState.final_report && dastReport && !exploitSucceeded;

    // Show fixes panel if we have fixes AND either:
    // 1. No Dynamic Exploit Testing report yet (before running Dynamic Exploit Testing)
    // 2. Dynamic Exploit Testing found vulnerabilities (exploit succeeded = need to regenerate)
    const showFixes = !hasReport && graphState.suggested_fixes && graphState.suggested_fixes.length > 0;

    return (
        <div className="h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 flex flex-col">
            <Header theme={theme} onToggleTheme={toggleTheme} />
            <main className="flex-grow p-4 lg:p-6 flex flex-col gap-6">
                {!isRunning && !graphState.sandbox_url && !graphState.sast_report && (
                    <Welcome />
                )}
                <ControlPanel
                    onStartScan={handleStartScan}
                    isRunning={isRunning}
                    scanError={scanError}
                />
                {(isRunning || graphState.sandbox_url || graphState.sast_report) && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 gap-6">
                            <div className="overflow-auto">
                                <ScanProgress graphState={graphState} />
                            </div>
                            <div className="overflow-auto" style={{ maxHeight: '500px' }}>
                                <ActivityLog logs={actionLogs} />
                            </div>
                        </div>
                        {showFixes && (
                            <VulnerabilityReport
                                fixes={graphState.suggested_fixes}
                                onApplyFix={handleApplyFix}
                                onRunDast={handleRunDast}
                                appliedFixes={appliedFixes}
                                graphState={graphState}
                                onRegenerateFixes={handleRegenerateFixes}
                                onFinish={handleFinish}
                                exploitSucceeded={exploitSucceeded}
                            />
                        )}
                        {hasReport && graphState.final_report && (
                            <VulnerabilityReport report={graphState.final_report} onClick={() => dispatch({ type: 'SET_IS_MODAL_OPEN', payload: true })} />
                        )}
                    </div>
                )}
            </main>
            {isModalOpen && hasReport && graphState.final_report && (
                 <FinalReportModal report={graphState.final_report} onClose={() => dispatch({ type: 'SET_IS_MODAL_OPEN', payload: false })} />
            )}
        </div>
    );
};

export default HomePage;
