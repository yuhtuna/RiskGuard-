import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { HASTGraphState, NodeStatus, NodeKey, Theme, ActionLog } from './types';
import { WORKFLOW_NODES } from './constants';
import Header from './components/Header';
import ControlPanel from './components/ControlPanel';
import StatePanel from './components/StatePanel';
import LogPanel from './components/LogPanel';
import WorkflowDiagram from './components/WorkflowDiagram';
import ResultPanel from './components/ResultPanel';
import FinalReportModal from './components/FinalReportModal';

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

const App: React.FC = () => {
    const [theme, setTheme] = useState<Theme>(() => {
        if (typeof window !== 'undefined' && window.localStorage) {
            const storedTheme = window.localStorage.getItem('theme') as Theme | null;
            if (storedTheme) return storedTheme;
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return 'dark';
    });
    const [isRunning, setIsRunning] = useState<boolean>(false);
    const [activeNode, setActiveNode] = useState<NodeKey | null>(null);
    const [nodeStatuses, setNodeStatuses] = useState<Record<NodeKey, NodeStatus>>(
        () => Object.keys(WORKFLOW_NODES).reduce((acc, key) => ({ ...acc, [key]: 'pending' }), {} as Record<NodeKey, NodeStatus>)
    );
    const [graphState, setGraphState] = useState<Partial<HASTGraphState>>({ final_report: null });
    const [actionLogs, setActionLogs] = useState<ActionLog[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [scanError, setScanError] = useState<string | null>(null);
    const [appliedFixes, setAppliedFixes] = useState<string[]>([]);
    const eventSourceRef = useRef<EventSource | null>(null);

    const actionMap = {
        'deploy_sandbox': 'Deploy Sandbox Environment',
        'sast_scan': 'Run SAST Scan on Source Code',
        'plan_attack': 'Generate DAST Attack Plan',
        'run_dast': 'Execute DAST Exploits',
        'destroy_sandbox': 'Destroy Sandbox Environment'
    };

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
    };

    const resetState = useCallback(() => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }
        setActionLogs([]);
        setGraphState({ final_report: null });
        setNodeStatuses(Object.keys(WORKFLOW_NODES).reduce((acc, key) => ({ ...acc, [key]: 'pending' }), {} as Record<NodeKey, NodeStatus>));
        setActiveNode(null);
        setIsRunning(false);
        setIsModalOpen(false);
        setScanError(null);
    }, []);
    
    const handleSseStream = async (response: Response) => {
        if (!response.body) {
            throw new Error("Response has no body");
        }

        const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
        let finalState = null;

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

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
                            switch (type) {
                                case 'node_status':
                                    setNodeStatuses(prev => ({ ...prev, [payload.node]: payload.status }));
                                    if (payload.status === 'active') {
                                        setActiveNode(payload.node);
                                        const actionKey = payload.node as keyof typeof actionMap;
                                        if (actionMap[actionKey]) {
                                            setActionLogs(prev => {
                                                if (prev.some(a => a.key === actionKey)) return prev;
                                                return [...prev, { key: actionKey, title: actionMap[actionKey], status: 'active', detailLogs: [] }];
                                            });
                                        }
                                    } else if (payload.status === 'success' || payload.status === 'failure') {
                                        setActionLogs(prev => prev.map(a => a.key === payload.node ? { ...a, status: payload.status } : a));
                                    }
                                    break;
                                case 'log':
                                    setActionLogs(prev => {
                                        const actionExists = prev.some(a => a.key === payload.actionKey);
                                        if (!actionExists && payload.actionKey !== 'start') {
                                            return [...prev, {
                                                key: payload.actionKey,
                                                title: actionMap[payload.actionKey as keyof typeof actionMap] || 'General',
                                                status: 'active',
                                                detailLogs: [payload.log]
                                            }];
                                        }
                                        return prev.map(action =>
                                            action.key === payload.actionKey
                                                ? { ...action, detailLogs: [...action.detailLogs, payload.log] }
                                                : action
                                        );
                                    });
                                    break;
                                case 'state':
                                    setGraphState(prev => ({ ...prev, ...payload }));
                                    break;
                                case 'control':
                                    if (payload.status === 'finished') {
                                        setIsRunning(false);
                                        setActiveNode(null);
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
        if (finalState) {
            setGraphState(finalState);
        }
    };

    const handleStartScan = useCallback(async (file: File | null) => {
        if (!file) {
            setScanError("No file selected.");
            return;
        }
        resetState();
        setIsRunning(true);
        setActionLogs(prev => [...prev, {
            key: 'file_upload',
            title: 'Uploading and Verifying File',
            status: 'active',
            detailLogs: [{ message: `Uploading ${file.name}...`, type: 'info', timestamp: (Date.now() / 1000).toString() }]
        }]);

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
                setScanError(errorMessage);
                setActionLogs(prev => prev.map(a => a.key === 'file_upload' ? { ...a, status: 'failure', detailLogs: [...a.detailLogs, { message: `Upload failed: ${errorMessage}`, type: 'failure', timestamp: (Date.now() / 1000).toString() }] } : a));
                setIsRunning(false);
                return;
            }

            setActionLogs(prev => prev.map(a => a.key === 'file_upload' ? { ...a, status: 'success', detailLogs: [...a.detailLogs, { message: 'File uploaded and verified.', type: 'success', timestamp: (Date.now() / 1000).toString() }] } : a));

            await handleSseStream(response);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            setScanError(errorMessage);
            setActionLogs(prev => prev.map(a => a.key === 'file_upload' ? { ...a, status: 'failure', detailLogs: [...a.detailLogs, { message: `Scan failed: ${errorMessage}`, type: 'failure', timestamp: (Date.now() / 1000).toString() }] } : a));
            setIsRunning(false);
        }
    }, [resetState]);

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
            setGraphState(newState);
            setAppliedFixes(prev => [...prev, patch]);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            setScanError(`Apply fix failed: ${errorMessage}`);
        }
    }, [graphState]);

    const handleRunDast = useCallback(async () => {
        try {
            const response = await fetch('http://127.0.0.1:8080/api/continue-scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ graph_state: graphState }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to start DAST scan');
            }

            await handleSseStream(response);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            setScanError(`DAST scan failed to start: ${errorMessage}`);
        }
    }, [graphState]);

    const hasReport = !isRunning && graphState.final_report;
    const showFixes = !hasReport && graphState.suggested_fixes && graphState.suggested_fixes.length > 0;

    return (
        <div className="h-screen bg-slate-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 flex flex-col">
            <Header theme={theme} onToggleTheme={toggleTheme} />
            <main className="flex-grow p-4 lg:p-6 flex flex-col xl:grid xl:grid-cols-12 gap-4 lg:gap-6 min-h-0 overflow-y-auto">
                <div className="xl:col-span-3 flex flex-col gap-4 lg:gap-6">
                    <ControlPanel
                        onStartScan={handleStartScan}
                        isRunning={isRunning}
                        scanError={scanError}
                    />
                    <StatePanel graphState={graphState} />
                </div>
                <div className="xl:col-span-6 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex justify-center grow basis-0 min-h-[300px] xl:min-h-0">
                    <WorkflowDiagram nodeStatuses={nodeStatuses} activeNode={activeNode} />
                </div>
                <div className="xl:col-span-3 flex flex-col gap-4 lg:gap-6 grow basis-0 min-h-[300px] xl:min-h-0">
                    <div className={hasReport || showFixes ? "grow-[2] basis-0 min-h-0" : "grow basis-0 min-h-0"}>
                        <LogPanel actions={actionLogs} />
                    </div>
                    {showFixes && (
                        <div className="grow basis-0 min-h-0">
                            <ResultPanel 
                                fixes={graphState.suggested_fixes} 
                                onApplyFix={handleApplyFix}
                                onRunDast={handleRunDast}
                                appliedFixes={appliedFixes}
                                graphState={graphState}
                            />
                        </div>
                    )}
                    {hasReport && (
                        <div className="grow basis-0 min-h-0">
                            <ResultPanel report={graphState.final_report!} onClick={() => setIsModalOpen(true)} />
                        </div>
                    )}
                </div>
            </main>
            {isModalOpen && hasReport && (
                 <FinalReportModal report={graphState.final_report!} onClose={() => setIsModalOpen(false)} />
            )}
        </div>
    );
};

export default App;
