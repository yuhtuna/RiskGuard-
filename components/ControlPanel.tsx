import React, { useState } from 'react';

interface ControlPanelProps {
    sourceCodeUrl: string;
    setSourceCodeUrl: (url: string) => void;
    onStartScan: (failureMode: 'none' | 'build' | 'exploit') => void;
    isRunning: boolean;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ sourceCodeUrl, setSourceCodeUrl, onStartScan, isRunning }) => {
    const [failureMode, setFailureMode] = useState<'none' | 'build' | 'exploit'>('none');
    
    return (
        <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-600 pb-2">Controls</h2>
            <div>
                <label htmlFor="sourceCodeUrl" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Source Code URL
                </label>
                <input
                    type="text"
                    id="sourceCodeUrl"
                    value={sourceCodeUrl}
                    onChange={(e) => setSourceCodeUrl(e.target.value)}
                    disabled={isRunning}
                    className="w-full bg-slate-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-gray-800 dark:text-gray-200 focus:ring-sky-500 focus:border-sky-500 transition"
                />
            </div>
             <div>
                <label htmlFor="failureMode" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Simulation Scenario
                </label>
                <select 
                    id="failureMode" 
                    value={failureMode}
                    onChange={(e) => setFailureMode(e.target.value as 'none' | 'build' | 'exploit')}
                    disabled={isRunning}
                    className="w-full bg-slate-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-gray-800 dark:text-gray-200 focus:ring-sky-500 focus:border-sky-500 transition"
                >
                    <option value="none">Success (Exploit Found)</option>
                    <option value="exploit">Failure (Not Exploitable)</option>
                    <option value="build">Failure (Build Fails)</option>
                </select>
            </div>
            <button
                onClick={() => onStartScan(failureMode)}
                disabled={isRunning}
                className="w-full bg-sky-600 hover:bg-sky-500 disabled:bg-gray-400 dark:disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-md transition-all duration-200 ease-in-out flex items-center justify-center gap-2"
            >
                {isRunning ? (
                    <>
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Running Scan...
                    </>
                ) : (
                    'Start Scan'
                )}
            </button>
        </div>
    );
};

export default ControlPanel;