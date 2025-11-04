import React, { useState } from 'react';

interface StateTableRowProps {
    itemKey: string;
    label: string;
    value: any;
    icon: React.ReactNode;
}

const StateTableRow: React.FC<StateTableRowProps> = ({ itemKey, label, value, icon }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const isCollapsible = value && (Array.isArray(value) && value.length > 0) || (typeof value === 'object' && value !== null && Object.keys(value).length > 0);

    const renderValue = () => {
        if (value === null || value === undefined) {
            return <span className="text-gray-400 dark:text-gray-500 font-mono text-xs">null</span>;
        }

        if (itemKey === 'build_status') {
            const statusColors = {
                SUCCESS: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 ring-1 ring-inset ring-green-600/20 dark:ring-green-500/30',
                FAILURE: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 ring-1 ring-inset ring-red-600/20 dark:ring-red-500/30',
                PENDING: 'bg-slate-200 text-slate-800 dark:bg-slate-700/50 dark:text-slate-300 ring-1 ring-inset ring-slate-600/20 dark:ring-slate-500/30',
            };
            const color = statusColors[value as keyof typeof statusColors] || statusColors.PENDING;
            return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>{value}</span>;
        }

        if (typeof value === 'string') {
            if (value.startsWith('http')) {
                return (
                    <a 
                        href={value} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-sky-500 hover:underline truncate max-w-[150px]" 
                        onClick={e => e.stopPropagation()}
                        title={value}
                    >
                        {value}
                    </a>
                );
            }
            return <span className="text-gray-500 dark:text-gray-400 font-mono truncate max-w-[150px]" title={value}>{`"${value}"`}</span>;
        }

        if (isCollapsible) {
            if (Array.isArray(value)) {
                return <span className="text-gray-500 dark:text-gray-400 font-mono">Array[{value.length}]</span>;
            }
            return <span className="text-gray-500 dark:text-gray-400 font-mono">Object</span>;
        }

        return <span className="text-gray-500 dark:text-gray-400">{String(value)}</span>;
    };

    const ChevronIcon: React.FC<{ expanded: boolean }> = ({ expanded }) => (
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 text-gray-400 dark:text-gray-500 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
    );

    return (
        <div className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-gray-800/60 transition-colors text-sm">
            <div 
                className={`flex items-center justify-between ${isCollapsible ? 'cursor-pointer' : ''}`} 
                onClick={() => isCollapsible && setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-2.5 flex-shrink min-w-0">
                    <div className="text-gray-400 dark:text-gray-500 flex-shrink-0">{icon}</div>
                    <span className="font-medium text-gray-600 dark:text-gray-300 truncate">{label}</span>
                </div>
                <div className="flex items-center gap-2 pl-2">
                    {renderValue()}
                    {isCollapsible && <ChevronIcon expanded={isExpanded} />}
                </div>
            </div>
            {isCollapsible && isExpanded && (
                <div className="mt-2 pl-4 ml-2 border-l border-slate-200 dark:border-gray-700">
                    <pre className="text-xs text-sky-700 dark:text-sky-300 whitespace-pre-wrap break-all bg-slate-100 dark:bg-gray-900/50 p-2 rounded-md">
                        {JSON.stringify(value, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
};

export default StateTableRow;