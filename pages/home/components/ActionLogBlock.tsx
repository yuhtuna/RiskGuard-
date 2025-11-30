import React, { useState } from 'react';
import type { ActionLog, LogEntry, NodeStatus } from '../../types';

interface ActionLogBlockProps {
    action: ActionLog;
}

const LogDetailLine: React.FC<{ log: LogEntry }> = ({ log }) => {
    // We want a clean terminal look
    // [TIMESTAMP] [TYPE] Message

    const typeColor = {
        info: 'text-blue-400',
        success: 'text-green-400',
        failure: 'text-red-400',
        agent: 'text-purple-400'
    };

    const time = new Date(Number(log.timestamp) * 1000).toISOString().split('T')[1].split('.')[0];

    return (
        <div className="font-mono text-xs mb-1 break-words">
            <span className="text-gray-500 mr-2">[{time}]</span>
            <span className={`uppercase font-bold mr-2 w-16 inline-block ${typeColor[log.type]}`}>[{log.type}]</span>
            <span className="text-gray-700 dark:text-gray-300">{log.message}</span>
        </div>
    );
};

const ActionLogBlock: React.FC<ActionLogBlockProps> = ({ action }) => {
    const [isExpanded, setIsExpanded] = useState(true);

    const statusIcon = {
        pending: <div className="w-2 h-2 bg-gray-500 rounded-full" />,
        active: <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />,
        success: <div className="w-2 h-2 bg-green-500 rounded-full" />,
        failure: <div className="w-2 h-2 bg-red-500 rounded-full" />
    };

    const hasDetails = action.detailLogs.length > 0;

    return (
        <div className="mb-2">
            <div
                className="flex items-center cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 p-1 rounded"
                onClick={() => hasDetails && setIsExpanded(!isExpanded)}
            >
                <div className="mr-2 w-4 flex justify-center">
                    {hasDetails ? (
                        <span className={`text-xs text-gray-500 transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                    ) : <span className="w-4"></span>}
                </div>
                <div className="mr-2 mt-1">{statusIcon[action.status]}</div>
                <div className="font-bold text-sm text-navy-800 dark:text-cream-100">{action.title}</div>
            </div>

            {isExpanded && hasDetails && (
                <div className="pl-8 py-1 border-l border-gray-300 dark:border-gray-700 ml-2.5">
                    {action.detailLogs.map((log, index) => (
                        <LogDetailLine key={index} log={log} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default ActionLogBlock;
