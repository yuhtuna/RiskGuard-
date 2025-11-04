import React, { useState } from 'react';
import type { FinalReport, SastFinding, DastFinding } from '../types';

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
                    <div className="font-semibold text-gray-700 dark:text-gray-300 mb-2">SAST Discovery</div>
                    <div className="flex items-center gap-3 mb-1 text-gray-600 dark:text-gray-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                        <span>{sast.file}:{sast.line}</span>
                    </div>
                    
                    <div className="font-semibold text-gray-700 dark:text-gray-300 mt-4 mb-2">DAST Confirmation</div>
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
    report: FinalReport;
    onClick?: () => void;
    isModalView?: boolean;
}

const ResultPanel: React.FC<ResultPanelProps> = ({ report, onClick, isModalView = false }) => {
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
    
    if (!report) return null;

    const meta = reportMeta[report.status];

    const renderContent = () => {
        switch (report.status) {
            case 'VULNERABILITY_CONFIRMED':
                return report.sastReport.map((sastFinding, i) => (
                    <VulnerabilityFindingBlock key={i} sast={sastFinding} dast={report.dastReport[i]} />
                ));
            case 'POTENTIAL_VULNERABILITY':
                return report.sastReport.map((sastFinding, i) => (
                    <VulnerabilityFindingBlock key={i} sast={sastFinding} />
                ));
            case 'BUILD_FAILED':
                return <p className="text-gray-600 dark:text-gray-400 text-sm px-2">{report.message}</p>;
            default:
                return null;
        }
    };

    const Wrapper = isModalView ? 'div' : 'button';
    const wrapperProps = isModalView ? {} : { onClick, className: "w-full h-full text-left" };

    const containerClasses = isModalView 
        ? "bg-transparent dark:bg-transparent"
        : "bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4 h-full flex flex-col cursor-pointer hover:border-sky-400 dark:hover:border-sky-500 transition-colors";

    return (
        <Wrapper {...wrapperProps}>
            <div className={containerClasses}>
                <div className={`flex items-center gap-3 border-b border-gray-200 dark:border-gray-600 pb-2 mb-2`}>
                    <div className={meta.color}>{meta.icon}</div>
                    <h2 className={`text-lg font-semibold ${meta.color}`}>{meta.title}</h2>
                </div>
                <div className="flex-grow overflow-y-auto bg-slate-100 dark:bg-black rounded-md p-2 flex flex-col gap-1.5">
                    {renderContent()}
                </div>
            </div>
        </Wrapper>
    );
};

export default ResultPanel;
