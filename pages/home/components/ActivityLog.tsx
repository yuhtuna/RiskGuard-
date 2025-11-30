import React, { useEffect, useRef } from 'react';
import type { ActionLog } from '../../../types';
import ActionLogBlock from './ActionLogBlock';

interface ActivityLogProps {
    logs: ActionLog[];
}

const ActivityLog: React.FC<ActivityLogProps> = ({ logs }) => {
    const logContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTo({
                top: logContainerRef.current.scrollHeight,
                behavior: 'smooth',
            });
        }
    }, [logs]);

    return (
        <div className="bg-cream-100 dark:bg-navy-800/90 backdrop-blur border border-cream-200 dark:border-navy-700 rounded-xl shadow-xl overflow-hidden flex flex-col h-[500px]">
            <div className="bg-cream-200 dark:bg-navy-900 px-4 py-2 border-b border-cream-300 dark:border-navy-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    </div>
                    <span className="ml-2 text-xs font-mono text-gray-600 dark:text-gray-400">root@hast-agent:~/logs</span>
                </div>
            </div>

            <div
                ref={logContainerRef}
                className="flex-grow overflow-y-auto p-4 space-y-4 font-mono text-sm bg-cream-50 dark:bg-navy-900/50"
            >
                {logs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-navy-700 opacity-50">
                         <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
                        <p>Waiting for system initialization...</p>
                    </div>
                ) : (
                    logs.map((log) => (
                        <ActionLogBlock key={log.key} action={log} />
                    ))
                )}
            </div>
        </div>
    );
};

export default ActivityLog;
