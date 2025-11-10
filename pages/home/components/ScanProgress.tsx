import React from 'react';
import type { HASTGraphState } from '../../../types';

// Define the props for the ScanProgress component
interface ScanProgressProps {
    graphState: Partial<HASTGraphState>;
}

// Define the structure for a single step in the scan progress
interface ScanStep {
    key: keyof HASTGraphState;
    label: string;
    status: 'complete' | 'active' | 'upcoming';
    details?: string | null;
}

// SVG Icon component for visual representation
const Icon: React.FC<{ path: string; className?: string }> = ({ path, className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
);

// Checkmark icon for completed steps
const CheckmarkIcon = () => <Icon path="M5 13l4 4L19 7" className="text-green-500" />;

// Spinner icon for the active step
const SpinnerIcon = () => (
    <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

// Component for a single step in the progress display
const Step: React.FC<{ step: ScanStep; isLast: boolean }> = ({ step, isLast }) => {
    const getStatusClasses = () => {
        switch (step.status) {
            case 'complete': return 'border-green-500 bg-green-500/10 text-green-500';
            case 'active': return 'border-blue-500 bg-blue-500/10 text-blue-500 animate-pulse';
            default: return 'border-gray-300 dark:border-gray-600';
        }
    };

    const getIcon = () => {
        switch (step.status) {
            case 'complete': return <CheckmarkIcon />;
            case 'active': return <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center"><SpinnerIcon /></div>;
            default: return <div className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-700" />;
        }
    };

    return (
        <div className="flex items-start">
            <div className="flex flex-col items-center mr-4">
                {getIcon()}
                {!isLast && (
                    <div className="w-px h-12 mt-2 relative">
                        <div className={`absolute inset-0 bg-gray-300 dark:bg-gray-600 ${step.status === 'complete' ? 'bg-green-500' : ''}`}></div>
                        {step.status === 'active' && (
                            <div
                                className="absolute inset-0 bg-transparent"
                                style={{
                                    backgroundImage: `linear-gradient(0deg, transparent, transparent 50%, #3b82f6 50%, #3b82f6)`,
                                    backgroundSize: '4px 8px',
                                    animation: 'marching-ants 1s linear infinite',
                                }}
                            ></div>
                        )}
                    </div>
                )}
            </div>
            <div className={`border-l-4 pl-4 -ml-px ${getStatusClasses()}`}>
                <h3 className={`font-semibold ${step.status === 'complete' ? 'text-gray-700 dark:text-gray-300' : 'text-gray-800 dark:text-white'}`}>{step.label}</h3>
                {step.details && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {step.details}
                    </p>
                )}
            </div>
        </div>
    );
};

const ScanProgress: React.FC<ScanProgressProps> = ({ graphState }) => {
    // Defines the order and labels of the steps
    const orderedSteps: { key: keyof HASTGraphState; label: string }[] = [
        { key: 'build_status', label: 'Build Application' },
        { key: 'sast_report', label: 'Static Code Analysis' },
        { key: 'attack_plan', label: 'Attack Plan Generation' },
        { key: 'dast_report', label: 'Dynamic Exploit Testing' },
        { key: 'final_report', label: 'Final Report' },
    ];

    let lastCompletedIndex = -1;
    for (let i = orderedSteps.length - 1; i >= 0; i--) {
        if (orderedSteps[i].key in graphState) {
            lastCompletedIndex = i;
            break;
        }
    }

    const steps: ScanStep[] = orderedSteps.map((stepInfo, index) => {
        const value = graphState[stepInfo.key];
        let status: 'complete' | 'active' | 'upcoming' = 'upcoming';
        let details: string | null = null;

        if (index < lastCompletedIndex) {
            status = 'complete';
        } else if (index === lastCompletedIndex) {
            status = 'complete';
        } else if (index === lastCompletedIndex + 1) {
            status = 'active';
        }


        if (value) {
            if (typeof value === 'object' && value !== null) {
                details = 'Report generated';
            } else if (typeof value === 'string') {
                if (value.startsWith('http') || value.startsWith('gs://')) {
                    details = 'Report generated';
                } else {
                    details = value;
                }
            }
        }

        // Handle build_status specifically
        if (stepInfo.key === 'build_status') {
            if (graphState.build_status === 'SUCCESS') {
                status = 'complete';
                details = 'Build successful';
            } else if (graphState.build_status === 'FAILURE') {
                status = 'complete'; // Or 'failed' if you add that state
                details = 'Build failed';
            }
        }

        return { ...stepInfo, status, details };
    });

    // If the scan hasn't started, show a placeholder
    if (Object.keys(graphState).length <= 1) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Scan Progress</h2>
                <div className="text-gray-500 dark:text-gray-400 text-center py-4 text-sm">Scan not started.</div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Scan Progress</h2>
            <div className="space-y-4">
                {steps.map((step, index) => (
                    <Step key={step.key} step={step} isLast={index === steps.length - 1} />
                ))}
            </div>
            <style jsx global>{`
                @keyframes marching-ants {
                    to {
                        background-position: 0 100%;
                    }
                }
            `}</style>
        </div>
    );
};

export default ScanProgress;
