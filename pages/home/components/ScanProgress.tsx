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
        <div className={`flex flex-col relative flex-1 items-center group`}>
            {/* Connector Line (Horizontal) */}
            {!isLast && (
                <div className="absolute top-5 left-1/2 w-full h-[2px] bg-gray-200 dark:bg-navy-700 -z-10">
                     {step.status === 'complete' && (
                        <div className="absolute inset-0 bg-navy-500 animate-[scanline_2s_linear_infinite]" style={{ width: '100%' }}></div>
                     )}
                </div>
            )}

            {/* Icon Circle */}
            <div className={`
                w-10 h-10 rounded-full flex items-center justify-center border-2 z-10 transition-all duration-300
                ${step.status === 'complete'
                    ? 'bg-navy-500 border-navy-500 text-navy-900 shadow-[0_0_15px_rgba(100,255,218,0.5)]'
                    : step.status === 'active'
                        ? 'bg-cream-100 border-navy-500 text-navy-500 animate-pulse'
                        : 'bg-cream-200 dark:bg-navy-800 border-gray-300 dark:border-navy-600 text-gray-400'}
            `}>
                {step.status === 'complete' ? (
                     <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                ) : step.status === 'active' ? (
                    <div className="w-3 h-3 bg-navy-500 rounded-full animate-ping"></div>
                ) : (
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                )}
            </div>

            {/* Label */}
            <div className="mt-4 text-center">
                <h3 className={`text-sm font-bold uppercase tracking-wider ${step.status === 'active' ? 'text-navy-800 dark:text-cream-100' : 'text-gray-500 dark:text-gray-400'}`}>
                    {step.label}
                </h3>
                {step.details && (
                    <span className="text-xs font-mono text-navy-500 mt-1 block max-w-[120px] truncate mx-auto">
                        {step.details}
                    </span>
                )}
            </div>
        </div>
    );
};

const ScanProgress: React.FC<ScanProgressProps> = ({ graphState }) => {
    const orderedSteps: { key: keyof HASTGraphState; label: string }[] = [
        { key: 'build_status', label: 'Build' },
        { key: 'sast_report', label: 'Analyze' },
        { key: 'attack_plan', label: 'Plan' },
        { key: 'dast_report', label: 'Attack' },
        { key: 'final_report', label: 'Report' },
    ];

    let lastCompletedIndex = -1;
    // ... logic same as before ...
     for (let i = orderedSteps.length - 1; i >= 0; i--) {
        if (orderedSteps[i].key in graphState) {
            lastCompletedIndex = i;
            break;
        }
    }

    const steps: ScanStep[] = orderedSteps.map((stepInfo, index) => {
        let status: 'complete' | 'active' | 'upcoming' = 'upcoming';
         // Simple logic: if index <= lastCompletedIndex, it is complete.
         // BUT wait, if it IS the last completed thing, is it done or active?
         // The original logic was:
         // if index < lastCompletedIndex -> complete
         // if index == lastCompletedIndex -> complete
         // if index == lastCompletedIndex + 1 -> active

         // Let's stick to that but refine build_status handling.

        if (index <= lastCompletedIndex) {
            status = 'complete';
        } else if (index === lastCompletedIndex + 1) {
            status = 'active';
        }

        // Special case for initial state (nothing started)
        // If graphState only has source_code_url (initial), then Build is Active?
        if (Object.keys(graphState).length <= 1 && index === 0) {
             // If we have source_code, build is arguably active or upcoming.
             // If we rely on isRunning from parent, we could pass it down.
             // For now, let's just say if we have graphState, the process has started.
             if (graphState.source_code_url && index === 0) status = 'active';
        }

        let details = null;
         if (stepInfo.key === 'build_status' && graphState.build_status) {
             details = graphState.build_status;
         }

        return { ...stepInfo, status, details };
    });

    if (Object.keys(graphState).length <= 1 && !graphState.source_code_url) return null;

    return (
        <div className="w-full mb-8">
            <div className="flex justify-between items-start w-full relative">
                {steps.map((step, index) => (
                    <Step key={step.key} step={step} isLast={index === steps.length - 1} />
                ))}
            </div>
        </div>
    );
};

export default ScanProgress;
