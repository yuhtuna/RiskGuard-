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
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 h-full flex flex-col">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Activity Log</h2>
            <div ref={logContainerRef} className="flex-grow overflow-y-auto bg-gray-100 dark:bg-gray-900 rounded-lg p-4 space-y-3">
                {logs.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                        <p>Scan logs will appear here...</p>
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
