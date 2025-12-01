import React from 'react';
import type { HASTGraphState } from '../../../types';

interface ScanProgressProps {
    graphState: Partial<HASTGraphState>;
}

interface ScanStep {
    key: keyof HASTGraphState;
    label: string;
    status: 'complete' | 'active' | 'upcoming';
    details?: string | null;
}

const Step: React.FC<{ step: ScanStep; isLast: boolean }> = ({ step, isLast }) => {
    return (
        <div className="flex items-start group">
            <div className="flex flex-col items-center mr-4 relative">
                {/* Step Indicator Circle */}
                <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold z-10 transition-all duration-500
                    ${step.status === 'complete'
                        ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)] scale-110'
                        : step.status === 'active'
                            ? 'bg-white dark:bg-navy-900 border-2 border-blue-500 text-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)] animate-pulse'
                            : 'bg-gray-100 dark:bg-navy-800 border-2 border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500'
                    }
                `}>
                    {step.status === 'complete' ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                    ) : step.status === 'active' ? (
                        <div className="w-3 h-3 bg-blue-500 rounded-full animate-ping" />
                    ) : (
                        <div className="w-2 h-2 bg-current rounded-full" />
                    )}
                </div>

                {/* Vertical Line */}
                {!isLast && (
                    <div className="w-0.5 h-16 mt-0 relative overflow-hidden bg-gray-200 dark:bg-navy-700">
                        {step.status === 'complete' && (
                             <div className="absolute inset-0 bg-gradient-to-b from-green-500 to-emerald-600" />
                        )}
                        {step.status === 'active' && (
                            <div className="absolute inset-0 bg-gradient-to-b from-blue-500 to-cyan-400 animate-scanline" />
                        )}
                    </div>
                )}
            </div>

            {/* Content Card */}
            <div className={`
                flex-1 p-4 rounded-xl border transition-all duration-300 transform
                ${step.status === 'active'
                    ? 'bg-white/90 dark:bg-navy-800/90 border-blue-500/30 shadow-lg scale-[1.02] translate-x-1 backdrop-blur-sm'
                    : step.status === 'complete'
                        ? 'bg-green-50/50 dark:bg-emerald-900/10 border-green-200 dark:border-green-900/30'
                        : 'bg-gray-50/50 dark:bg-navy-800/30 border-gray-200 dark:border-white/5 opacity-60'
                }
            `}>
                <div className="flex justify-between items-center mb-1">
                    <h3 className={`font-bold text-lg ${
                        step.status === 'active' ? 'text-blue-600 dark:text-blue-400' :
                        step.status === 'complete' ? 'text-green-600 dark:text-green-400' :
                        'text-gray-500 dark:text-gray-400'
                    }`}>
                        {step.label}
                    </h3>
                    {step.status === 'active' && (
                         <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                        </span>
                    )}
                </div>

                {step.details && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                        {step.details}
                    </p>
                )}

                {step.status === 'active' && (
                    <div className="mt-2 h-1.5 w-full bg-gray-100 dark:bg-navy-900 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 w-1/2 animate-[shimmer_1.5s_infinite] relative">
                             <div className="absolute inset-0 bg-white/30 skew-x-12 animate-[shimmer_1s_infinite]" />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const ScanProgress: React.FC<ScanProgressProps> = ({ graphState }) => {
    const orderedSteps: { key: keyof HASTGraphState; label: string }[] = [
        { key: 'build_status', label: 'Build Application' },
        { key: 'sast_report', label: 'Static Code Analysis' },
        { key: 'attack_plan', label: 'Attack Plan Generation' },
        { key: 'dast_report', label: 'Dynamic Exploit Testing' },
        { key: 'final_report', label: 'Final Report' },
    ];

    let lastCompletedIndex = -1;
    for (let i = orderedSteps.length - 1; i >= 0; i--) {
        const key = orderedSteps[i].key;
        const value = graphState[key];
        if (value !== null && value !== undefined) {
            lastCompletedIndex = i;
            break;
        }
    }

    const steps: ScanStep[] = orderedSteps.map((stepInfo, index) => {
        const value = graphState[stepInfo.key];
        const status: 'complete' | 'active' | 'upcoming' = 
            index <= lastCompletedIndex ? 'complete' :
            index === lastCompletedIndex + 1 ? 'active' :
            'upcoming';
        
        let details: string | null = null;
        if (value !== null && value !== undefined) {
            if (stepInfo.key === 'build_status') {
                details = graphState.build_status === 'SUCCESS' ? 'Build successful' : 
                          graphState.build_status === 'FAILURE' ? 'Build failed' : null;
            } else if (typeof value === 'object') {
                details = 'Report generated';
            } else if (typeof value === 'string') {
                details = (value.startsWith('http') || value.startsWith('gs://')) ? 
                          'Report generated' : value;
            }
        }
        return { ...stepInfo, status, details };
    });

    if (Object.keys(graphState).length <= 1) {
        return (
            <div className="bg-white/60 dark:bg-navy-800/60 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl p-8 shadow-lg">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Scan Progress</h2>
                <div className="flex flex-col items-center justify-center py-8 text-gray-500 dark:text-gray-400">
                    <div className="w-16 h-16 mb-4 rounded-full bg-gray-100 dark:bg-navy-900 flex items-center justify-center">
                        <svg className="w-8 h-8 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <p className="font-medium">Waiting for scan to start...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white/60 dark:bg-navy-800/60 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl p-6 shadow-xl transition-all duration-300 hover:shadow-2xl">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Audit Timeline
            </h2>
            <div className="space-y-0 pl-2">
                {steps.map((step, index) => (
                    <Step key={step.key} step={step} isLast={index === steps.length - 1} />
                ))}
            </div>
        </div>
    );
};

export default ScanProgress;
