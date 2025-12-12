import React, { useState } from 'react';

interface ControlPanelProps {
    onStartScan: (file: File) => void;
    isRunning: boolean;
    scanError: string | null;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ onStartScan, isRunning, scanError }) => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        event.preventDefault();
        if (event.target.files && event.target.files[0]) {
            setSelectedFile(event.target.files[0]);
        }
    };

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setSelectedFile(e.dataTransfer.files[0]);
        }
    };

    const handleStartClick = () => {
        if (selectedFile) {
            onStartScan(selectedFile);
        }
    };

    return (
        <div className="relative overflow-hidden bg-white/60 dark:bg-navy-800/60 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl p-6 shadow-xl transition-all duration-300 hover:shadow-2xl hover:bg-white/70 dark:hover:bg-navy-800/70">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500 animate-gradient"></div>

            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                Scan Configuration
            </h2>

            <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">
                    Source Code Upload
                </label>

                <div 
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    className={`
                        relative group flex flex-col items-center justify-center w-full h-40
                        border-2 border-dashed rounded-xl transition-all duration-300 ease-out
                        ${isDragOver
                            ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 scale-[1.02]'
                            : 'border-gray-300 dark:border-gray-600 bg-gray-50/30 dark:bg-navy-900/30 hover:border-blue-400 hover:bg-blue-50/30 dark:hover:bg-blue-900/10'
                        }
                    `}
                >
                    <input
                        id="file-upload"
                        type="file"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                        onChange={handleFileChange}
                        accept=".zip"
                        disabled={isRunning}
                    />

                    <div className="flex flex-col items-center space-y-3 pointer-events-none">
                        <div className={`p-3 rounded-full bg-white dark:bg-navy-800 shadow-md transition-transform duration-300 group-hover:scale-110 ${isDragOver ? 'scale-110' : ''}`}>
                            <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                Click to upload or drag & drop
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                ZIP archives only (max 50MB)
                            </p>
                        </div>
                    </div>
                </div>

                {selectedFile && (
                    <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg animate-fade-in-up">
                        <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg">
                            <svg className="w-5 h-5 text-blue-600 dark:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {selectedFile.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Ready for analysis
                            </p>
                        </div>
                        <button
                            onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                            className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full text-gray-400 hover:text-red-500 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                )}

                {scanError && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg flex items-start gap-3 animate-shake">
                        <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-sm text-red-600 dark:text-red-300">{scanError}</p>
                    </div>
                )}

                <button
                    type="button"
                    onClick={handleStartClick}
                    disabled={isRunning || !selectedFile}
                    className={`
                        w-full group relative overflow-hidden rounded-xl p-[2px] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                        ${isRunning || !selectedFile ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.01] active:scale-[0.99] transition-transform duration-200'}
                    `}
                >
                    <span className="absolute inset-0 bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 animate-gradient-x"></span>
                    <span className="relative flex items-center justify-center gap-2 w-full h-full bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-bold py-3 px-6 rounded-[10px] group-hover:bg-opacity-90 transition-colors">
                        {isRunning ? (
                            <>
                                <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>Scanning System...</span>
                            </>
                        ) : (
                            <>
                                <span>Start Security Scan</span>
                                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                            </>
                        )}
                    </span>
                </button>
            </div>
        </div>
    );
};

export default ControlPanel;
