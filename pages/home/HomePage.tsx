import React, { useReducer, useCallback, useRef, useEffect, useState } from 'react';
import type { HASTGraphState, Theme } from '../../types';
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
    const [isCreatingPR, setIsCreatingPR] = useState(false);

    const eventSourceRef = useRef<EventSource | null>(null);

    const actionMap = {
        'file_upload': 'Cloning Repository',
        'generate_dockerfile': 'Generate Dockerfile',
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
            const response = await fetch('/api/scan', { // Use relative path for proxy
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

    const handleDownload = useCallback(async () => {
        try {
            const downloadResponse = await fetch('/api/download', { // Use relative path
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

    const handleCreatePR = useCallback(async () => {
        setIsCreatingPR(true);
        dispatch({
            type: 'ADD_ACTION_LOG',
            payload: {
                key: 'submit_pr',
                title: 'Creating Pull Request',
                status: 'active',
                detailLogs: [{ message: 'Submitting PR to GitHub...', type: 'info', timestamp: (Date.now() / 1000).toString() }],
            },
        });

        try {
            const response = await fetch('/api/finish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ graph_state: graphState }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create Pull Request');
            }

            const data = await response.json();

            // Dispatch update to graph state with PR URL
            dispatch({
                type: 'SET_GRAPH_STATE',
                payload: {
                     final_report: {
                         ...graphState.final_report,
                         pr_url: data.pr_url,
                         summary: 'Autonomous scan complete. PR Created.'
                     }
                }
            });

             dispatch({
                type: 'UPDATE_ACTION_LOG',
                payload: {
                    key: 'submit_pr',
                    status: 'success',
                },
            });
             dispatch({
                type: 'ADD_DETAIL_LOG',
                payload: {
                    actionKey: 'submit_pr',
                    log: { message: `PR created successfully: ${data.pr_url}`, type: 'success', timestamp: (Date.now() / 1000).toString() }
                },
            });

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            dispatch({ type: 'SET_SCAN_ERROR', payload: `PR Creation failed: ${errorMessage}` });
             dispatch({
                type: 'UPDATE_ACTION_LOG',
                payload: {
                    key: 'submit_pr',
                    status: 'failure',
                },
            });
             dispatch({
                type: 'ADD_DETAIL_LOG',
                payload: {
                    actionKey: 'submit_pr',
                    log: { message: `Failed to create PR: ${errorMessage}`, type: 'failure', timestamp: (Date.now() / 1000).toString() }
                },
            });
        } finally {
            setIsCreatingPR(false);
        }
    }, [graphState]);

    const activeLog = actionLogs.at(-1);
    const historyLogs = actionLogs.length > 1 ? actionLogs.slice(0, -1).reverse() : [];

    // Determine if PR has been generated
    const prUrl = graphState.final_report?.pr_url;
    const showDashboard = isRunning || graphState.sandbox_url || graphState.sast_report;

    return (
        <div className="h-screen overflow-hidden bg-cream-50/70 dark:bg-navy-900/80 text-gray-800 dark:text-gray-200 flex flex-col transition-colors duration-500 relative">
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
                                appliedFixes={appliedFixes} // Just for visual indication if we keep it
                                graphState={graphState}
                                onDownload={handleDownload}
                                prUrl={prUrl}
                                onCreatePR={handleCreatePR}
                                isCreatingPR={isCreatingPR}
                            />
                        }
                    />
                </div>
            )}

            {isModalOpen && graphState.final_report && (
                 <FinalReportModal report={graphState.final_report} onClose={() => dispatch({ type: 'SET_IS_MODAL_OPEN', payload: false })} />
            )}
        </div>
    );
};

export default HomePage;
