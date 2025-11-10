import React, { useRef, useEffect } from 'react';
import type { HASTGraphState } from '../../types';
import StateTableRow from './StateTableRow';

interface StatePanelProps {
    graphState: Partial<HASTGraphState>;
}

const Icon: React.FC<{ path: string }> = ({ path }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
);

const KEY_META: Record<string, { label: string; icon: React.ReactNode }> = {
    source_code_url: { label: 'Source Code', icon: <Icon path="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /> },
    sandbox_url: { label: 'Sandbox URL', icon: <Icon path="M5 12h14M12 5l7 7-7 7" /> },
    build_status: { label: 'Build Status', icon: <Icon path="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /> },
    sast_report: { label: 'Static Code Analysis Report', icon: <Icon path="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" /> },
    attack_plan: { label: 'Attack Plan', icon: <Icon path="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 16.382V5.618a1 1 0 00-1.447-.894L15 7m-6 10h6" /> },
    dast_report: { label: 'Dynamic Exploit Testing Report', icon: <Icon path="M13 10V3L4 14h7v7l9-11h-7z" /> },
    final_report: { label: 'Final Report', icon: <Icon path="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /> },
};


const StatePanel: React.FC<StatePanelProps> = ({ graphState }) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({
                top: scrollContainerRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [graphState]);

    const orderedKeys = [
        'source_code_url',
        'build_status',
        'sandbox_url',
        'sast_report',
        'attack_plan',
        'dast_report',
        'final_report',
    ];

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Scan Progress</h2>
            <div ref={scrollContainerRef} className="space-y-4">
                {Object.keys(graphState).length > 1 ? (
                    orderedKeys.map(key => {
                        if (key in graphState) {
                           const meta = KEY_META[key] || { label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), icon: null };
                           const value = graphState[key as keyof HASTGraphState];
                           if (value === null) {
                               return null;
                           }
                           return <StateTableRow key={key} itemKey={key} label={meta.label} value={value} icon={meta.icon} />;
                        }
                        return null;
                    }).filter(Boolean)
                ) : (
                    <div className="text-gray-500 dark:text-gray-400 text-center py-4 text-sm">Scan not started.</div>
                )}
            </div>
        </div>
    );
};

export default StatePanel;
