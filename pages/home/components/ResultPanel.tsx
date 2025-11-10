import React, { useState } from 'react';
import type { FinalReport, SastFinding, DastFinding, SuggestedFix, HASTGraphState } from '../types';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import { docco } from 'react-syntax-highlighter/dist/esm/styles/hljs';

const FixBlock: React.FC<{ fix: SuggestedFix; onApplyFix: (patch: string) => void; isApplied: boolean }> = ({ fix, onApplyFix, isApplied }) => {
    const [isExpanded, setIsExpanded] = useState(true);

    return (
        <div className="bg-white/50 dark:bg-gray-800/20 rounded-md transition-colors duration-200">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full text-left flex items-center gap-3 p-2.5 rounded-md hover:bg-slate-200/50 dark:hover:bg-gray-700/50 cursor-pointer"
            >
                <div className="flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 3.5a1.5 1.5 0 011.5 1.5v2.121a2.5 2.5 0 001.768 2.364l.232.077a.75.75 0 010 1.376l-.232.077a2.5 2.5 0 00-1.768 2.364v2.121a1.5 1.5 0 01-3 0v-2.121a2.5 2.5 0 00-1.768-2.364l-.232-.077a.75.75 0 010-1.376l.232-.077a2.5 2.5 0 001.768-2.364V5A1.5 1.5 0 0110 3.5z" />
                        <path d="M13.5 5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                </div>
                <div className="flex-grow font-sans text-sm font-semibold text-blue-600 dark:text-blue-400">
                    {fix.description}
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 text-gray-400 dark:text-gray-500 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
            </button>
            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isExpanded ? 'max-h-[400px]' : 'max-h-0'}`}>
                <div className="border-t border-slate-200 dark:border-gray-700/50 p-3 mt-1 ml-4 pl-5 border-l text-sm">
                    <p className="text-gray-600 dark:text-gray-400 mb-2">{fix.description}</p>
                    <div className="max-h-48 overflow-y-auto rounded-md">
                        <SyntaxHighlighter language="diff" style={docco} customStyle={{ backgroundColor: 'rgba(241, 245, 249, 0.8)' }}>
                            {fix.patch}
                        </SyntaxHighlighter>
                    </div>
                    <button 
                        onClick={() => onApplyFix(fix.patch)}
                        disabled={isApplied}
                        className="mt-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-1 px-3 rounded-md text-xs disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        {isApplied ? 'Fix Applied' : 'Apply Fix'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const VulnerabilityFindingBlock: React.FC<{ sast: SastFinding; dast?: DastFinding }> = ({ sast, dast }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const isConfirmed = dast?.status === 'SUCCESS';

    const severityIcon = isConfirmed ? (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.03-1.742 3.03H4.42c-1.532 0-2.492-1.696-1.742-3.03l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
    ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 102 0V6zm-1 9a1 1 0 110-2 1 1 0 010 2z" clipRule="evenodd" />
        </svg>
    );

    return (
        <div className="bg-white/50 dark:bg-gray-800/20 rounded-md transition-colors duration-200">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full text-left flex items-center gap-3 p-2.5 rounded-md hover:bg-slate-200/50 dark:hover:bg-gray-700/50 cursor-pointer"
            >
                <div className="flex-shrink-0">{severityIcon}</div>
                <div className={`flex-grow font-sans text-sm font-semibold ${isConfirmed ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                    {sast.vulnerability_type}: {sast.flaw}
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 text-gray-400 dark:text-gray-500 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
            </button>
            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isExpanded ? 'max-h-96' : 'max-h-0'}`}>
                <div className="border-t border-slate-200 dark:border-gray-700/50 p-3 mt-1 ml-4 pl-5 border-l text-sm">
                    <div className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Static Code Analysis Discovery</div>
                    <div className="flex items-center gap-3 mb-1 text-gray-600 dark:text-gray-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                        <span>{sast.file}:{sast.line}</span>
                    </div>
                    
                    <div className="font-semibold text-gray-700 dark:text-gray-300 mt-4 mb-2">Dynamic Exploit Testing Confirmation</div>
                    {isConfirmed ? (
                        <div className="flex items-center gap-3 text-green-600 dark:text-green-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                            <span>Exploit Successful. Proof: <code className="bg-slate-200 dark:bg-gray-700 text-green-700 dark:text-green-300 px-1 py-0.5 rounded text-xs">{dast?.proof_of_exploit}</code></span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                            <span>Exploit failed. Vulnerability not proven in this run.</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

interface ResultPanelProps {
    report?: FinalReport;
    fixes?: SuggestedFix[];
    onClick?: () => void;
    onApplyFix?: (patch: string) => void;
    onRunDast?: () => void;
    appliedFixes?: string[];
    isModalView?: boolean;
    graphState?: Partial<HASTGraphState>;
    onRegenerateFixes?: () => void;
    onFinish?: () => void;
    exploitSucceeded?: boolean;
}

const ResultPanel: React.FC<ResultPanelProps> = ({ report, fixes, onClick, onApplyFix, onRunDast, appliedFixes, isModalView = false, graphState, onRegenerateFixes, onFinish, exploitSucceeded }) => {
    if (fixes && onApplyFix && onRunDast && appliedFixes && onRegenerateFixes && onFinish) {
        // Determine if Dynamic Exploit Testing has been run
        const hasDastResults = graphState?.dast_report !== undefined && graphState?.dast_report !== null;
        
        // Determine which action button to show
        let actionButton = null;
        if (hasDastResults) {
            if (exploitSucceeded) {
                // Dynamic Exploit Testing ran and exploit succeeded = fix FAILED, need to regenerate
                actionButton = (
                    <button
                        onClick={onRegenerateFixes}
                        className="bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-1 px-3 rounded-md text-sm"
                    >
                        🔄 Regenerate Fixes
                    </button>
                );
            } else {
                // Dynamic Exploit Testing ran and exploit FAILED = fix WORKED, can finish
                actionButton = (
                    <button
                        onClick={onFinish}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-1 px-3 rounded-md text-sm"
                    >
                        ✅ Finish & Download
                    </button>
                );
            }
        }
        
        return (
            <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4 h-full flex flex-col">
                <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-600 pb-2 mb-2">
                    <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Suggested Fixes</h2>
                    <div className="flex items-center gap-2">
                        {actionButton}
                        {!hasDastResults && (
                            // Dynamic Exploit Testing hasn't run yet, show the Run Dynamic Exploit Testing button
                            <button 
                                onClick={onRunDast}
                                className="bg-green-600 hover:bg-green-500 text-white font-bold py-1 px-3 rounded-md text-sm"
                            >
                                🚀 Run Dynamic Exploit Testing
                            </button>
                        )}
                    </div>
                </div>
                <div className="flex-grow overflow-y-auto bg-slate-100 dark:bg-black rounded-md p-2 flex flex-col gap-1.5">
                    {fixes.map((fix) => <FixBlock key={fix.patch} fix={fix} onApplyFix={onApplyFix} isApplied={appliedFixes.includes(fix.patch)} />)}
                </div>
            </div>
        );
    }
    
    if (!report) return null;

    const reportMeta = {
        VULNERABILITY_CONFIRMED: {
            title: "Vulnerability Confirmed!",
            color: "text-red-600 dark:text-red-400",
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        },
        POTENTIAL_VULNERABILITY: {
            title: "Potential Vulnerability Found",
            color: "text-yellow-600 dark:text-yellow-400",
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        },
        BUILD_FAILED: {
            title: "Build Failed",
            color: "text-gray-500 dark:text-gray-400",
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        }
    };
    
    const meta = reportMeta[report.status] ?? reportMeta['BUILD_FAILED'];

    const renderContent = () => {
        switch (report.status) {
            case 'VULNERABILITY_CONFIRMED':
                return report.sastReport.map((sastFinding) => (
                    <VulnerabilityFindingBlock
                        key={`${sastFinding.file}-${sastFinding.line}`}
                        sast={sastFinding}
                        dast={report.dastReport.find((d) => {
                            const dd = d as any;
                            // prefer explicit vulnerability_type match if present, otherwise fallback to file+line match
                            return dd.vulnerability_type === sastFinding.vulnerability_type || (dd.file === sastFinding.file && dd.line === sastFinding.line);
                        })}
                    />
                ));
            case 'POTENTIAL_VULNERABILITY':
                return report.sastReport.map((sastFinding) => (
                    <VulnerabilityFindingBlock key={`${sastFinding.file}-${sastFinding.line}`} sast={sastFinding} />
                ));
            case 'BUILD_FAILED':
                return <p className="text-gray-600 dark:text-gray-400 text-sm px-2">{report.message}</p>;
            default:
                return null;
        }
    };

    const containerClasses = isModalView 
        ? "bg-transparent dark:bg-transparent"
        : "bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4 h-full flex flex-col cursor-pointer hover:border-sky-400 dark:hover:border-sky-500 transition-colors";

    const wrapperProps = isModalView ? {} : { onClick, role: "button", tabIndex: 0 };

    return (
        <div {...wrapperProps} className="w-full h-full">
            <div className={containerClasses}>
                <div className={`flex items-center gap-3 border-b border-gray-200 dark:border-gray-600 pb-2 mb-2`}>
                    <div className={meta?.color ?? 'text-gray-700'}>{meta.icon}</div>
                    <h2 className={`text-lg font-semibold ${meta?.color ?? 'text-gray-700'}`}>{meta.title}</h2>
                </div>
                <div className="flex-grow overflow-y-auto bg-slate-100 dark:bg-black rounded-md p-2 flex flex-col gap-1.5">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default ResultPanel;
