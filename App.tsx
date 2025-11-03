import React, { useState, useCallback, useRef } from 'react';
import type { HASTGraphState, NodeStatus, NodeKey, LogEntry, LogType } from './types';
import { WORKFLOW_NODES, WORKFLOW_EDGES } from './constants';
import Header from './components/Header';
import ControlPanel from './components/ControlPanel';
import StatePanel from './components/StatePanel';
import LogPanel from './components/LogPanel';
import WorkflowDiagram from './components/WorkflowDiagram';
import ResultPanel from './components/ResultPanel';

const App: React.FC = () => {
    const [sourceCodeUrl, setSourceCodeUrl] = useState<string>('https://github.com/user/vulnerable-app-example');
    const [isRunning, setIsRunning] = useState<boolean>(false);
    const [activeNode, setActiveNode] = useState<NodeKey | null>(null);
    const [nodeStatuses, setNodeStatuses] = useState<Record<NodeKey, NodeStatus>>(
        () => Object.keys(WORKFLOW_NODES).reduce((acc, key) => ({ ...acc, [key]: 'pending' }), {} as Record<NodeKey, NodeStatus>)
    );
    const [graphState, setGraphState] = useState<Partial<HASTGraphState>>({});
    const [logs, setLogs] = useState<LogEntry[]>([]);

    const logsRef = useRef(logs);
    logsRef.current = logs;

    const graphStateRef = useRef(graphState);
    graphStateRef.current = graphState;

    const addLog = useCallback((message: string, type: LogType = 'info') => {
        const timestamp = new Date().toLocaleTimeString();
        setLogs(prev => [...prev, { message, type, timestamp }]);
    }, []);

    const updateNodeStatus = useCallback((node: NodeKey, status: NodeStatus) => {
        setNodeStatuses(prev => ({ ...prev, [node]: status }));
        setActiveNode(status === 'active' ? node : null);
    }, []);

    const updateGraphState = useCallback((newState: Partial<HASTGraphState>) => {
        setGraphState(prev => ({ ...prev, ...newState }));
    }, []);

    const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

    const resetState = useCallback(() => {
        setLogs([]);
        setGraphState({});
        setNodeStatuses(Object.keys(WORKFLOW_NODES).reduce((acc, key) => ({ ...acc, [key]: 'pending' }), {} as Record<NodeKey, NodeStatus>));
        setActiveNode(null);
        setIsRunning(false);
    }, []);
    
    const handleStartScan = useCallback(async (failureMode: 'none' | 'build' | 'exploit') => {
        resetState();
        setIsRunning(true);
        addLog('Starting HAST-Agent workflow...');
        updateGraphState({ source_code_url: sourceCodeUrl });

        await delay(500);

        // 1. Deploy Sandbox
        updateNodeStatus('deploy_sandbox', 'active');
        addLog('Agent: Environment Manager - Deploying sandbox...', 'agent');
        await delay(2000);
        const buildFailed = failureMode === 'build';
        if (buildFailed) {
            updateNodeStatus('deploy_sandbox', 'failure');
            addLog('Tool: Cloud Build failed.', 'failure');
            updateGraphState({ build_status: 'FAILURE', final_report: 'Build failed. Could not deploy the application to the sandbox environment.' });
            await delay(500);
            updateNodeStatus('report_build_failure', 'success');
        } else {
            updateNodeStatus('deploy_sandbox', 'success');
            addLog('Tool: Deployment successful.', 'success');
            const sandboxUrl = "https://temp-app-xyz-a1b2c3d4.a.run.app";
            updateGraphState({ build_status: 'SUCCESS', sandbox_url: sandboxUrl });
            await delay(500);

            // 2. SAST Scan
            updateNodeStatus('sast_scan', 'active');
            addLog('Agent: SAST Agent - Scanning source code...', 'agent');
            await delay(2000);
            const sastReport = [{ file: "app.py", line: 15, flaw: "Raw SQL query (SQL Injection)", vulnerability_type: "SQLi" }];
            updateGraphState({ sast_report: sastReport });
            updateNodeStatus('sast_scan', 'success');
            addLog('SAST Agent: Found 1 potential vulnerability.', 'info');
            await delay(500);

            // 3. Plan Attack
            updateNodeStatus('plan_attack', 'active');
            addLog('Agent: Planning Agent - Creating DAST attack plan...', 'agent');
            await delay(2000);
            const attackPlan = [{ target_url: `${sandboxUrl}/login`, vulnerability_type: "SQLi", payload: "' OR '1'='1' --" }];
            updateGraphState({ attack_plan: attackPlan });
            updateNodeStatus('plan_attack', 'success');
            addLog('Planning Agent: Attack plan generated.', 'info');
            await delay(500);

            // 4. Run DAST
            updateNodeStatus('run_dast', 'active');
            addLog(`Agent: DAST Agent - Executing SQLi attack on ${attackPlan[0].target_url}`, 'agent');
            await delay(2500);
            
            const exploitFailed = failureMode === 'exploit';
            if(exploitFailed) {
                const dastReport = [{ status: "FAILURE", proof_of_exploit: null }];
                updateGraphState({ dast_report: dastReport });
                updateNodeStatus('run_dast', 'failure');
                addLog('DAST Agent: Exploit failed. Vulnerability not proven.', 'failure');
                await delay(500);
                updateNodeStatus('report_no_exploit', 'success');
                const finalReport = `SAST Flaw Found, Not Exploitable: ${JSON.stringify(sastReport, null, 2)}`;
                updateGraphState({ final_report: finalReport });
            } else {
                const dastReport = [{ status: "SUCCESS", proof_of_exploit: "Extracted admin_session_token" }];
                updateGraphState({ dast_report: dastReport });
                updateNodeStatus('run_dast', 'success');
                addLog('DAST Agent: Exploit successful! Proof captured.', 'success');
                await delay(500);
                updateNodeStatus('report_exploit_found', 'success');
                const finalReport = `Exploit Found: ${JSON.stringify(dastReport, null, 2)}`;
                updateGraphState({ final_report: finalReport });
            }
        }

        // 5. Destroy Sandbox
        await delay(1000);
        updateNodeStatus('destroy_sandbox', 'active');
        addLog('Agent: Environment Manager - Destroying sandbox...', 'agent');
        await delay(1500);
        updateNodeStatus('destroy_sandbox', 'success');
        addLog('Sandbox destroyed. Workflow complete.', 'info');

        setIsRunning(false);
        setActiveNode(null);
    }, [addLog, resetState, sourceCodeUrl, updateGraphState, updateNodeStatus]);

    const hasReport = !isRunning && graphState.final_report;

    return (
        <div className="min-h-screen bg-gray-900 text-gray-200 flex flex-col">
            <Header />
            <main className="flex-grow p-4 lg:p-6 grid grid-cols-1 xl:grid-cols-12 gap-4 lg:gap-6">
                <div className="xl:col-span-3 flex flex-col gap-4 lg:gap-6">
                    <ControlPanel
                        sourceCodeUrl={sourceCodeUrl}
                        setSourceCodeUrl={setSourceCodeUrl}
                        onStartScan={handleStartScan}
                        isRunning={isRunning}
                    />
                    <StatePanel graphState={graphState} />
                </div>
                <div className="xl:col-span-6 bg-gray-800/50 border border-gray-700 rounded-lg p-4 flex justify-center min-h-[500px] xl:min-h-0">
                    <WorkflowDiagram nodeStatuses={nodeStatuses} activeNode={activeNode} />
                </div>
                <div className="xl:col-span-3 flex flex-col gap-4 lg:gap-6">
                    <div className={hasReport ? "grow-[2] basis-0 min-h-0" : "grow basis-0 min-h-0"}>
                        <LogPanel logs={logs} />
                    </div>
                    {hasReport && (
                        <div className="grow basis-0 min-h-0">
                            <ResultPanel report={graphState.final_report} />
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default App;