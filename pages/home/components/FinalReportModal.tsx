import React from 'react';
import type { FinalReport } from '../types';
import VulnerabilityReport from './VulnerabilityReport'; // Re-use the inner content logic

interface FinalReportModalProps {
    report: FinalReport;
    onClose: () => void;
}

const FinalReportModal: React.FC<FinalReportModalProps> = ({ report, onClose }) => {
    return (
        <div 
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
            onClick={onClose}
            aria-modal="true"
            role="dialog"
        >
            <div 
                className="bg-slate-50 dark:bg-gray-900 w-full max-w-2xl max-h-[90vh] rounded-xl shadow-2xl flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">
                        HAST-Agent Final Report
                    </h2>
                    <button 
                        onClick={onClose} 
                        className="p-1 text-gray-500 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                        aria-label="Close modal"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </header>
                <main className="flex-grow p-2 overflow-y-auto">
                   {/* We can re-use the VulnerabilityReport component here for consistency, but without the outer shell */}
                   <VulnerabilityReport report={report} isModalView />
                </main>
            </div>
        </div>
    );
};

export default FinalReportModal;
