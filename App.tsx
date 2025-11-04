import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { HASTGraphState, NodeStatus, NodeKey, LogEntry, LogType, Theme, ActionLog, FinalReport } from './types';
import { WORKFLOW_NODES, WORKFLOW_EDGES } from './constants';
import Header from './components/Header';
import ControlPanel from './components/ControlPanel';
import StatePanel from './components/StatePanel';
import LogPanel from './components/LogPanel';
import WorkflowDiagram from './components/WorkflowDiagram';
import ResultPanel from './components/ResultPanel';
import FinalReportModal from './components/FinalReportModal';

const App: React.FC = () => {
    const [theme, setTheme] = useState<Theme>(() => {
        if (typeof window !== 'undefined' && window.localStorage) {
            const storedTheme = window.localStorage.getItem('theme') as Theme | null;
            if (storedTheme) return storedTheme;
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return 'dark';
    });
    const [sourceCodeUrl, setSourceCodeUrl] = useState<string>('https://github.com/user/vulnerable-app-example');
    const [isRunning, setIsRunning] = useState<boolean>(false);
    const [activeNode, setActiveNode] = useState<NodeKey | null>(null);
    const [nodeStatuses, setNodeStatuses] = useState<Record<NodeKey, NodeStatus>>(
        () => Object.keys(WORKFLOW_NODES).reduce((acc, key) => ({ ...acc, [key]: 'pending' }), {} as Record<NodeKey, NodeStatus>)
    );
    const [graphState, setGraphState] = useState<Partial<HASTGraphState>>({ final_report: null });
    const [actionLogs, setActionLogs] = useState<ActionLog[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
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
    }, []);

    const handleStartScan = useCallback(async (failureMode: 'none' | 'build' | 'exploit') => {
        resetState();
        setIsRunning(true);

        const eventSource = new EventSource(`/api/start-scan?failureMode=${failureMode}&sourceCodeUrl=${encodeURIComponent(sourceCodeUrl)}`);
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
            console.log("Connection to server opened.");
        };

        eventSource.onmessage = (event) => {
            const data = JSON.parse(event.data);
            const { type, payload } = data;

            switch (type) {
                case 'node_status':
                    setNodeStatuses(prev => ({ ...prev, [payload.node]: payload.status }));
                    if (payload.status === 'active') {
                        setActiveNode(payload.node);
                        const actionKey = payload.node as keyof typeof actionMap;
                        if (actionMap[actionKey]) {
                           setActionLogs(prev => {
                               if (prev.find(a => a.key === actionKey)) return prev;
                               return [...prev, { key: actionKey, title: actionMap[actionKey], status: 'active', detailLogs: [] }];
                           });
                        }
                    } else if (payload.status === 'success' || payload.status === 'failure') {
                       setActionLogs(prev => prev.map(a => a.key === payload.node ? { ...a, status: payload.status } : a));
                    }
                    break;
                case 'log':
                    setActionLogs(prev => {
                        // Find if the action block already exists
                        const actionExists = prev.some(a => a.key === payload.actionKey);
                        if (!actionExists && payload.actionKey !== 'start') {
                            // This case should ideally not happen if node_status comes first
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
                        eventSource.close();
                    }
                    break;
                default:
                    console.warn("Unknown event type:", type);
            }
        };

        eventSource.onerror = (err) => {
            console.error("EventSource failed:", err);
            setActionLogs(prev => [...prev, {
                key: 'error',
                title: 'Connection Error',
                status: 'failure',
                detailLogs: [{ message: 'Lost connection to the server.', type: 'failure', timestamp: new Date().toLocaleTimeString() }]
            }]);
            setIsRunning(false);
            eventSource.close();
        };

    }, [sourceCodeUrl, resetState]);
    
    // A fetch-based version for environments that don't proxy SSE well
    // Kept here for reference
    const handleStartScanWithFetch = useCallback(async (failureMode: 'none' | 'build' | 'exploit') => {
        resetState();
        setIsRunning(true);

        try {
            const response = await fetch('/api/start-scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sourceCodeUrl, failureMode }),
            });

            if (!response.body) {
                throw new Error("Response has no body");
            }

            const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                
                // Process SSE messages
                const lines = value.split('\n\n');
                for (const line of lines) {
                    if (line.startsWith('data:')) {
                        const jsonString = line.substring(5);
                        if(jsonString.trim()){
                            const data = JSON.parse(jsonString);
                            const { type, payload } = data;

                            switch (type) {
                                case 'node_status':
                                    setNodeStatuses(prev => ({ ...prev, [payload.node]: payload.status }));
                                    if (payload.status === 'active') {
                                        setActiveNode(payload.node);
                                        const actionKey = payload.node as keyof typeof actionMap;
                                        if (actionMap[actionKey]) {
                                        setActionLogs(prev => {
                                            if (prev.find(a => a.key === actionKey)) return prev;
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
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Failed to start scan:", error);
            setActionLogs(prev => [...prev, {
                key: 'error',
                title: 'Connection Error',
                status: 'failure',
                detailLogs: [{ message: 'Could not connect to the server.', type: 'failure', timestamp: new Date().toLocaleTimeString() }]
            }]);
            setIsRunning(false);
        }
    }, [sourceCodeUrl, resetState]);


    const hasReport = !isRunning && graphState.final_report;

    return (
        <div className="h-screen bg-slate-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 flex flex-col">
            <Header theme={theme} onToggleTheme={toggleTheme} />
            <main className="flex-grow p-4 lg:p-6 flex flex-col xl:grid xl:grid-cols-12 gap-4 lg:gap-6 min-h-0 overflow-y-auto">
                <div className="xl:col-span-3 flex flex-col gap-4 lg:gap-6">
                    <ControlPanel
                        sourceCodeUrl={sourceCodeUrl}
                        setSourceCodeUrl={setSourceCodeUrl}
                        onStartScan={handleStartScanWithFetch}
                        isRunning={isRunning}
                    />
                    <StatePanel graphState={graphState} />
                </div>
                <div className="xl:col-span-6 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex justify-center grow basis-0 min-h-[300px] xl:min-h-0">
                    <WorkflowDiagram nodeStatuses={nodeStatuses} activeNode={activeNode} />
                </div>
                <div className="xl:col-span-3 flex flex-col gap-4 lg:gap-6 grow basis-0 min-h-[300px] xl:min-h-0">
                    <div className={hasReport ? "grow-[2] basis-0 min-h-0" : "grow basis-0 min-h-0"}>
                        <LogPanel actions={actionLogs} />
                    </div>
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
