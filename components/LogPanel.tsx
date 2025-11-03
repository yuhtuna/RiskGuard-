
import React, { useEffect, useRef } from 'react';
import type { LogEntry } from '../types';

interface LogPanelProps {
    logs: LogEntry[];
}

const LogLine: React.FC<{ log: LogEntry }> = ({ log }) => {
    const iconMap: Record<LogEntry['type'], React.ReactNode> = {
        info: <span className="text-gray-500 font-mono">&gt;</span>,
        success: <span className="text-green-500 font-bold">✓</span>,
        failure: <span className="text-red-500 font-bold">✗</span>,
        agent: <span className="text-sky-500">●</span>,
    };

    const colorMap: Record<LogEntry['type'], string> = {
        info: 'text-gray-300',
        success: 'text-green-400',
        failure: 'text-red-400',
        agent: 'text-sky-300',
    };

    return (
        <div className={`flex items-start gap-3 animate-fadeIn text-sm ${colorMap[log.type]}`}>
            <div className="flex-shrink-0 pt-1">{iconMap[log.type]}</div>
            <div className="flex-grow">{log.message}</div>
            <div className="flex-shrink-0 text-gray-500 text-xs pt-1">{log.timestamp}</div>
        </div>
    );
};

const LogPanel: React.FC<LogPanelProps> = ({ logs }) => {
    const logContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [logs]);

    return (
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 h-full flex flex-col">
            <h2 className="text-lg font-semibold text-gray-300 border-b border-gray-600 pb-2 mb-2">Logs</h2>
            <div ref={logContainerRef} className="flex-grow overflow-y-auto bg-black rounded-md p-3 font-mono flex flex-col gap-2">
                {logs.map((log, index) => (
                    <LogLine key={index} log={log} />
                ))}
            </div>
        </div>
    );
};

export default LogPanel;
