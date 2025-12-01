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
        <div className="bg-white/60 dark:bg-navy-800/60 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl p-6 shadow-xl h-[600px] flex flex-col transition-all duration-300 hover:shadow-2xl">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                System Console
            </h2>
            <div
                ref={logContainerRef}
                className="flex-grow overflow-y-auto bg-gray-50 dark:bg-navy-900/50 rounded-xl border border-gray-200 dark:border-navy-700 p-4 space-y-3 font-mono text-sm scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-navy-600"
            >
                {logs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
                        <div className="w-12 h-12 mb-3 rounded-lg bg-gray-200 dark:bg-navy-800 flex items-center justify-center animate-pulse">
                            <span className="text-2xl">_</span>
                        </div>
                        <p className="font-medium">Waiting for system output...</p>
                    </div>
                ) : (
                    logs.map((log) => (
                        <ActionLogBlock key={log.id} action={log} />
                    ))
                )}
            </div>
        </div>
    );
};

export default ActivityLog;
