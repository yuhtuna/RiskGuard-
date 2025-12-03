import React from 'react';
import type { ActionLog } from '../../../types';

interface TaskHistoryPaneProps {
    logs: ActionLog[];
}

const LogIcon: React.FC<{ status: string }> = ({ status }) => {
    switch (status) {
        case 'active':
            return (
                <div className="h-5 w-5 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                   <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse"></div>
                </div>
            );
        case 'success':
            return (
                <div className="h-5 w-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center border border-green-200 dark:border-green-800">
                    <svg className="w-3 h-3 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
            );
        case 'failure':
            return (
                <div className="h-5 w-5 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center border border-red-200 dark:border-red-800">
                    <svg className="w-3 h-3 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </div>
            );
        default:
            return <div className="h-5 w-5 rounded-full bg-gray-200 dark:bg-gray-700" />;
    }
};

const HistoryRow: React.FC<{ log: ActionLog }> = ({ log }) => (
    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-white/40 dark:bg-navy-800/40 border border-gray-200/50 dark:border-white/5 transition-all hover:bg-white/60 dark:hover:bg-navy-700/60 group">
        <LogIcon status={log.status} />
        <div className="flex-1 min-w-0">
            <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {log.title}
            </h4>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate opacity-80">
                {log.detailLogs.length > 0 ? log.detailLogs[log.detailLogs.length - 1].message : 'No details available'}
            </p>
        </div>
        <span className="text-[10px] font-mono text-gray-400 opacity-60">
            {log.detailLogs.length > 0 && new Date(parseFloat(log.detailLogs[log.detailLogs.length - 1].timestamp) * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
    </div>
);

const TaskHistoryPane: React.FC<TaskHistoryPaneProps> = ({ logs }) => {
    if (!logs || logs.length === 0) {
        return null; // Or return a placeholder if desired, but "empty" is fine for history
    }

    return (
        <div className="bg-white/60 dark:bg-navy-800/60 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-white/10 flex flex-col overflow-hidden h-full shadow-lg">
            <div className="px-4 py-2 border-b border-gray-100 dark:border-white/5 bg-white/20 dark:bg-navy-900/20">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Task History</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-navy-600 scrollbar-track-transparent">
                {logs.map((log) => (
                    <HistoryRow key={log.id} log={log} />
                ))}
            </div>
        </div>
    );
};

export default TaskHistoryPane;
