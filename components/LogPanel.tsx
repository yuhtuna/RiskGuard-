import React, { useEffect, useRef } from 'react';
import type { ActionLog } from '../types';
import ActionLogBlock from './ActionLogBlock';

interface LogPanelProps {
    actions: ActionLog[];
}

const LogPanel: React.FC<LogPanelProps> = ({ actions }) => {
    const logContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTo({
                top: logContainerRef.current.scrollHeight,
                behavior: 'smooth',
            });
        }
    }, [actions]);

    return (
        <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4 h-full flex flex-col">
            <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-600 pb-2 mb-4">Action Log</h2>
            <div ref={logContainerRef} className="flex-grow overflow-y-auto bg-gray-100 dark:bg-black rounded-lg p-3 flex flex-col gap-2">
                {actions.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                        <p>Scan logs will appear here...</p>
                    </div>
                ) : (
                    actions.map((action) => (
                        <ActionLogBlock key={action.key} action={action} />
                    ))
                )}
            </div>
        </div>
    );
};

export default LogPanel;