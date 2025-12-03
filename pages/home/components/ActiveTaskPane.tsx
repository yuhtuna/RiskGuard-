import React, { useState } from 'react';
import type { ActionLog, LogEntry } from '../../../types';

interface ActiveTaskPaneProps {
    activeLog?: ActionLog;
}

const LogIcon: React.FC<{ status: string }> = ({ status }) => {
    switch (status) {
        case 'active':
            return (
                <div className="relative flex h-6 w-6">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-6 w-6 bg-blue-500 items-center justify-center">
                    <svg className="w-4 h-4 text-white animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </span>
                </div>
            );
        case 'success':
            return (
                <div className="h-6 w-6 rounded-full bg-green-500 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
            );
        case 'failure':
            return (
                <div className="h-6 w-6 rounded-full bg-red-500 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </div>
            );
        default:
            return <div className="h-6 w-6 rounded-full bg-gray-400" />;
    }
};

const DetailLogEntry: React.FC<{ entry: LogEntry }> = ({ entry }) => (
    <div className={`flex gap-2 text-xs font-mono ${
        entry.type === 'failure' ? 'text-red-500' :
        entry.type === 'success' ? 'text-green-500' :
        entry.type === 'agent' ? 'text-purple-500' :
        'text-gray-500 dark:text-gray-400'
    }`}>
        <span className="opacity-50">[{new Date(parseFloat(entry.timestamp) * 1000).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span>
        <span>{entry.message}</span>
    </div>
);

const ActiveTaskPane: React.FC<ActiveTaskPaneProps> = ({ activeLog }) => {
    const [showDetails, setShowDetails] = useState(true); // Default to open for visibility

    if (!activeLog) {
        return (
            <div className="bg-white/60 dark:bg-navy-800/60 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl p-6 flex items-center justify-center text-gray-400 dark:text-gray-500 h-full min-h-[150px]">
                <div className="flex flex-col items-center animate-pulse">
                    <div className="w-12 h-12 mb-3 rounded-full bg-gray-100 dark:bg-navy-900 flex items-center justify-center">
                        <svg className="w-6 h-6 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <p className="font-medium text-sm">Ready to initiate sequence...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative group flex-shrink-0 w-full">
            {/* Glow effect */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>

            <div className="relative bg-white/80 dark:bg-navy-900/90 backdrop-blur-xl rounded-2xl p-5 shadow-xl border border-white/20 dark:border-navy-700/50">
                <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shadow-inner">
                            <LogIcon status={activeLog.status} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                {activeLog.title}
                                {activeLog.status === 'active' && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 animate-pulse border border-blue-200 dark:border-blue-800">
                                        LIVE
                                    </span>
                                )}
                            </h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                {activeLog.detailLogs.length > 0
                                    ? activeLog.detailLogs[activeLog.detailLogs.length - 1].message
                                    : 'Initializing task...'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowDetails(!showDetails)}
                        className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 px-2 py-1 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                    >
                        {showDetails ? 'Hide Console' : 'View Console'}
                        <svg className={`w-3 h-3 transition-transform ${showDetails ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                </div>

                {/* Collapsible Console Output */}
                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${showDetails ? 'max-h-64 opacity-100 mt-3' : 'max-h-0 opacity-0'}`}>
                    <div className="bg-gray-950 rounded-lg p-3 font-mono text-[11px] overflow-y-auto max-h-48 border border-gray-800 shadow-inner scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                        {activeLog.detailLogs.map((entry, idx) => (
                            <DetailLogEntry key={idx} entry={entry} />
                        ))}
                            {activeLog.status === 'active' && (
                            <div className="flex gap-2 text-blue-400 animate-pulse mt-1">
                                <span>&gt;</span>
                                <span className="w-1.5 h-3 bg-blue-400"></span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Progress Bar (Visual only) */}
                {activeLog.status === 'active' && (
                    <div className="mt-3 h-1 w-full bg-gray-200 dark:bg-navy-800 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 w-1/3 animate-[shimmer_2s_infinite]"></div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ActiveTaskPane;
