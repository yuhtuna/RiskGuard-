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
            <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-600 pb-2 mb-2">Logs</h2>
            <div ref={logContainerRef} className="flex-grow overflow-y-auto bg-slate-100 dark:bg-black rounded-md p-2 flex flex-col gap-1.5">
                {actions.map((action) => (
                    <ActionLogBlock key={action.key} action={action} />
                ))}
            </div>
        </div>
    );
};

export default LogPanel;