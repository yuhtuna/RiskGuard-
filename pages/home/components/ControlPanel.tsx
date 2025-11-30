import React, { useState } from 'react';
import { UploadIcon, ZapIcon } from './Icons';

interface ControlPanelProps {
    onStartScan: (file: File) => void;
    isRunning: boolean;
    scanError: string | null;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ onStartScan, isRunning, scanError }) => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            setSelectedFile(event.target.files[0]);
            onStartScan(event.target.files[0]);
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
            onStartScan(e.dataTransfer.files[0]);
        }
    };

    const handleStartClick = () => {
        if (selectedFile) {
            onStartScan(selectedFile);
        }
    };

    return (
        <div className="bg-cream-100 dark:bg-navy-800/80 backdrop-blur-md border border-cream-200 dark:border-navy-700 rounded-xl p-6 shadow-xl transition-all duration-300">
            <h2 className="text-xl font-bold text-navy-800 dark:text-cream-50 border-b border-cream-200 dark:border-navy-600 pb-3 mb-4 flex items-center gap-2">
                <UploadIcon className="w-5 h-5 text-navy-500" />
                Upload Target
            </h2>

            <div className="flex flex-col gap-6">
                <div>
                    <label htmlFor="file-upload" className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
                        Source Code Archive
                    </label>
                    <div
                        onDragEnter={handleDragEnter}
                        onDragLeave={handleDragLeave}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        className={`
                            relative group cursor-pointer
                            flex flex-col justify-center items-center px-6 py-10
                            border-2 border-dashed rounded-xl transition-all duration-300
                            ${isDragOver
                                ? 'border-navy-500 bg-navy-500/10 scale-[1.02]'
                                : 'border-gray-300 dark:border-gray-600 hover:border-navy-500/50 hover:bg-navy-500/5'}
                        `}
                    >
                        <input id="file-upload" name="file-upload" type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleFileChange} accept=".zip" disabled={isRunning} />

                        <div className="p-4 rounded-full bg-cream-50 dark:bg-navy-700 mb-3 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                            <UploadIcon className="h-8 w-8 text-navy-500" />
                        </div>

                        <div className="text-center">
                            <p className="text-lg font-medium text-navy-800 dark:text-cream-100">
                                Drop your ZIP file here
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                or click to browse
                            </p>
                        </div>
                    </div>

                    {selectedFile && (
                        <div className="mt-4 p-3 bg-navy-500/10 border border-navy-500/20 rounded-lg flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                            <span className="text-sm font-medium text-navy-800 dark:text-cream-100 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-navy-500"></span>
                                {selectedFile.name}
                            </span>
                            <span className="text-xs text-navy-500 font-mono">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                        </div>
                    )}

                    {scanError && (
                        <div className="mt-4 text-sm text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-600/50 rounded-lg p-3 shadow-sm animate-pulse">
                            <span className="font-bold">Error:</span> {scanError}
                        </div>
                    )}
                </div>

                <button
                    onClick={handleStartClick}
                    disabled={isRunning || !selectedFile}
                    className={`
                        w-full py-4 px-6 rounded-lg font-bold text-lg tracking-wide uppercase transition-all duration-300 shadow-lg
                        flex items-center justify-center gap-3 overflow-hidden relative
                        ${isRunning || !selectedFile
                            ? 'bg-gray-300 dark:bg-navy-700 text-gray-500 cursor-not-allowed'
                            : 'bg-navy-800 hover:bg-navy-700 dark:bg-navy-500 dark:hover:bg-navy-400 text-cream-100 dark:text-navy-900 hover:-translate-y-1 hover:shadow-navy-500/25'}
                    `}
                >
                    {isRunning ? (
                        <>
                            <ZapIcon className="animate-spin h-6 w-6" />
                            <span>Processing...</span>
                            <div className="absolute bottom-0 left-0 h-1 bg-navy-500 animate-[loading_2s_ease-in-out_infinite] w-full"></div>
                        </>
                    ) : (
                        <>
                            <ZapIcon className="h-6 w-6" />
                            <span>Initialize Scan</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

export default ControlPanel;
