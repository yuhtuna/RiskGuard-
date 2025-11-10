import React, { useState } from 'react';
import type { ActionLog, LogEntry, NodeStatus } from '../../../types';

// SVG Icon component for visual representation
const Icon: React.FC<{ path: string; className?: string }> = ({ path, className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
);

const LogDetailLine: React.FC<{ log: LogEntry }> = ({ log }) => {
    const iconMap: Record<LogEntry['type'], React.ReactNode> = {
        info: <Icon path="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" className="text-gray-400 dark:text-gray-500" />,
        success: <Icon path="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" className="text-green-500" />,
        failure: <Icon path="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" className="text-red-500" />,
        agent: <Icon path="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" className="text-sky-500" />,
    };

    const colorMap: Record<LogEntry['type'], string> = {
        info: 'text-gray-600 dark:text-gray-400',
        success: 'text-green-600 dark:text-green-400',
        failure: 'text-red-600 dark:text-red-400',
        agent: 'text-sky-600 dark:text-sky-300',
    };

    const bgClassMap: Record<LogEntry['type'], string> = {
        info: 'bg-gray-100/50 dark:bg-gray-800/20',
        success: 'bg-green-100/50 dark:bg-green-800/20',
        failure: 'bg-red-100/50 dark:bg-red-800/20',
        agent: 'bg-sky-100/50 dark:bg-sky-800/20',
    };

    return (
        <div className={`flex items-start gap-3 text-sm p-2 rounded-md ${colorMap[log.type]} ${bgClassMap[log.type]}`}>
            <div className="flex-shrink-0 pt-0.5">{iconMap[log.type]}</div>
            <div className="flex-grow break-words min-w-0">{log.message}</div>
            <div className="flex-shrink-0 text-gray-400 dark:text-gray-500 text-xs pt-0.5 ml-2">
                {new Date(Number(log.timestamp) * 1000).toLocaleTimeString()}
            </div>
        </div>
    );
};


interface ActionLogBlockProps {
    action: ActionLog;
}

const ActionLogBlock: React.FC<ActionLogBlockProps> = ({ action }) => {
    const [isExpanded, setIsExpanded] = useState(true);

    const statusMap: Record<NodeStatus, { icon: React.ReactNode; color: string }> = {
        pending: {
            icon: <div className="h-2.5 w-2.5 rounded-full bg-gray-400 animate-pulse" />,
            color: 'text-gray-500 dark:text-gray-400',
        },
        active: {
            icon: (
                <svg className="animate-spin h-4 w-4 text-sky-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            ),
            color: 'text-sky-500 dark:text-sky-400',
        },
        success: {
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
            ),
            color: 'text-green-600 dark:text-green-400',
        },
        failure: {
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
            ),
            color: 'text-red-600 dark:text-red-400',
        },
    };
    
    const hasDetails = action.detailLogs.length > 0;
    const isClickable = hasDetails || action.status !== 'pending';

    return (
        <div className="bg-white/60 dark:bg-gray-800/40 rounded-lg transition-colors duration-200 shadow-sm">
            <button
                onClick={() => isClickable && setIsExpanded(!isExpanded)}
                disabled={!isClickable}
                className={`w-full text-left flex items-center gap-3 p-2.5 rounded-lg ${isClickable ? 'hover:bg-gray-200/50 dark:hover:bg-gray-700/50 cursor-pointer' : 'cursor-default'}`}
            >
                <div className="flex-shrink-0 w-5 flex items-center justify-center">{statusMap[action.status].icon}</div>
                <div className={`flex-grow font-sans text-sm font-medium ${statusMap[action.status].color}`}>{action.title}</div>
                {hasDetails && (
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className={`h-5 w-5 text-gray-400 dark:text-gray-500 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                )}
            </button>
            <div
                className={`transition-all duration-300 ease-in-out overflow-hidden ${isExpanded ? 'max-h-[500px]' : 'max-h-0'}`}
            >
                <div className="border-t border-gray-200 dark:border-gray-700/60 p-3 mt-1 ml-4 pl-6 border-l">
                    <div className="flex flex-col gap-2.5">
                        {action.detailLogs.map((log, index) => (
                            <LogDetailLine key={index} log={log} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ActionLogBlock;
