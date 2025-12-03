import React, { useReducer, useCallback, useRef, useEffect, useState } from 'react';
import type { HASTGraphState, NodeStatus, NodeKey, Theme, ActionLog } from '../../types';
import { WORKFLOW_NODES } from '../../constants';
import Header from './components/Header';
import ScanProgress from './components/ScanProgress';
import ActiveTaskPane from './components/ActiveTaskPane';
import TaskHistoryPane from './components/TaskHistoryPane';
import VulnerabilityReport from './components/VulnerabilityReport';
import FinalReportModal from './components/FinalReportModal';
import Welcome from './components/Welcome';
import AnimatedBackground from './components/AnimatedBackground';
import DashboardLayout from './components/DashboardLayout';
import { GitHubLogin } from './components/GitHubLogin';
import { RepositoryList } from './components/RepositoryList';
import { initialState, reducer } from './state';
import { useSse } from './useSse';

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
    const [githubAuth, setGithubAuth] = useState<{username: string, token: string} | null>(null);
    const [repos, setRepos] = useState<any[]>([]);

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

    const handleLogin = (username: string, token: string, repositoryList: any[]) => {
        setGithubAuth({ username, token });
        setRepos(repositoryList);
    };

    const handleSelectRepo = useCallback(async (repo: any) => {
        if (!githubAuth) return;

        resetState();
        dispatch({ type: 'SET_IS_RUNNING', payload: true });
        dispatch({
            type: 'ADD_ACTION_LOG',
            payload: {
                key: 'file_upload',
                title: 'Cloning Repository',
                status: 'active',
                detailLogs: [{ message: `Cloning ${repo.full_name}...`, type: 'info', timestamp: (Date.now() / 1000).toString() }],
            },
        });

        try {
            const response = await fetch('http://127.0.0.1:8080/api/scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    repo_url: repo.clone_url,
                    token: githubAuth.token,
                    default_branch: repo.default_branch
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                const errorMessage = errorData.error || `HTTP error! status: ${response.status}`;
                throw new Error(errorMessage);
            }

            dispatch({
                type: 'UPDATE_ACTION_LOG',
                payload: {
                    key: 'file_upload',
                    status: 'success',
                },
            });

            await handleSseStream(response);
        } catch (error) {
            console.error('Error in handleSelectRepo:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            dispatch({ type: 'SET_SCAN_ERROR', payload: errorMessage });
            dispatch({ type: 'SET_IS_RUNNING', payload: false });
        }
    }, [resetState, handleSseStream, githubAuth]);

    const handleApplyFix = useCallback(async (patch: string) => {
        // In the new flow, apply fix automatically triggers verify (DAST)
        // so we start the SSE stream immediately
        try {
            dispatch({ type: 'SET_IS_RUNNING', payload: true }); // Ensure running state

            const response = await fetch('http://127.0.0.1:8080/api/apply-fix', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ patch, graph_state: graphState }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to apply fix');
            }

            dispatch({ type: 'ADD_APPLIED_FIX', payload: patch });
            await handleSseStream(response);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            dispatch({ type: 'SET_SCAN_ERROR', payload: `Apply fix failed: ${errorMessage}` });
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
            const response = await fetch('http://127.0.0.1:8080/api/finish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ graph_state: graphState }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to submit PR');
            }

            // Show success message or redirect to PR
            if (data.pr_url) {
                window.open(data.pr_url, '_blank');
            }

            resetState();
            // Optional: reset login or keep logged in
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            dispatch({ type: 'SET_SCAN_ERROR', payload: `Finish process failed: ${errorMessage}` });
        }
    }, [graphState, resetState]);

    const handleDownload = useCallback(async () => {
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
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            dispatch({ type: 'SET_SCAN_ERROR', payload: `Download failed: ${errorMessage}` });
        }
    }, [graphState]);

    const dastReport = graphState.dast_report;
    const exploitSucceeded = dastReport?.vulnerabilities?.some((v) => v.status === 'SUCCESS') || false;

    // Show final report only if Dynamic Exploit Testing completed successfully (exploit failed = fix worked)
    const hasReport = !isRunning && graphState.final_report && dastReport && !exploitSucceeded;

    const showDashboard = isRunning || graphState.sandbox_url || graphState.sast_report;

    const activeLog = actionLogs.length > 0 ? actionLogs[actionLogs.length - 1] : undefined;
    const historyLogs = actionLogs.length > 1 ? actionLogs.slice(0, actionLogs.length - 1).reverse() : [];

    return (
        <div className="h-screen overflow-hidden bg-cream-50/90 dark:bg-navy-900/90 text-gray-800 dark:text-gray-200 flex flex-col transition-colors duration-500">
            <AnimatedBackground />
            <Header theme={theme} onToggleTheme={toggleTheme} />

            {!showDashboard ? (
                <main className="flex-grow container mx-auto p-4 lg:p-6 flex flex-col gap-6 relative z-10 justify-center max-w-2xl overflow-y-auto">
                    <Welcome />
                    {!githubAuth ? (
                        <GitHubLogin onLogin={handleLogin} />
                    ) : (
                        <RepositoryList repos={repos} onSelect={handleSelectRepo} />
                    )}

                    {scanError && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-center">
                            {scanError}
                        </div>
                    )}
                </main>
            ) : (
                <div className="flex-grow relative z-10 h-full overflow-hidden">
                    <DashboardLayout
                        sidebar={
                            <ScanProgress graphState={graphState} />
                        }
                        activeTask={
                            <ActiveTaskPane activeLog={activeLog} />
                        }
                        taskHistory={
                             <TaskHistoryPane logs={historyLogs} />
                        }
                        mainContent={
                            <VulnerabilityReport
                                report={graphState.final_report}
                                fixes={graphState.suggested_fixes}
                                onApplyFix={handleApplyFix}
                                onRunDast={() => {}} // No longer manual
                                appliedFixes={appliedFixes}
                                graphState={graphState}
                                onRegenerateFixes={handleRegenerateFixes}
                                onFinish={handleFinish}
                                onDownload={handleDownload}
                                exploitSucceeded={exploitSucceeded}
                            />
                        }
                    />
                </div>
            )}

            {isModalOpen && hasReport && graphState.final_report && (
                 <FinalReportModal report={graphState.final_report} onClose={() => dispatch({ type: 'SET_IS_MODAL_OPEN', payload: false })} />
            )}
        </div>
    );
};

export default HomePage;
