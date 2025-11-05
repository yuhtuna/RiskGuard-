import React, { useState, useCallback } from 'react';

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
        e.preventDefault(); // This is necessary to allow for 'drop'
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
        <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-600 pb-2">Scan Configuration</h2>
            <div>
                <label htmlFor="file-upload" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Upload Source Code (ZIP)
                </label>
                <div 
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md transition-colors ${isDragOver ? 'border-sky-500 bg-sky-100 dark:bg-sky-900/50' : 'border-gray-300 dark:border-gray-600'}`}
                >
                    <div className="space-y-1 text-center">
                        <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <div className="flex text-sm text-gray-600 dark:text-gray-400">
                            <label htmlFor="file-upload" className="relative cursor-pointer bg-transparent rounded-md font-medium text-sky-600 hover:text-sky-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-sky-500">
                                <span>Upload a file</span>
                                <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept=".zip" disabled={isRunning} />
                            </label>
                            <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                            ZIP up to <span className="font-bold">50MB</span>
                        </p>
                    </div>
                </div>
                {selectedFile && (
                    <div className="mt-3 text-sm text-gray-700 dark:text-gray-300">
                        <span className="font-medium">Selected file:</span> {selectedFile.name}
                    </div>
                )}
                {scanError && (
                    <div className="mt-2 text-sm text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 rounded-md p-2">
                        {scanError}
                    </div>
                )}
            </div>
            <button
                onClick={handleStartClick}
                disabled={isRunning || !selectedFile}
                className="w-full bg-sky-600 hover:bg-sky-500 disabled:bg-gray-400 dark:disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-md transition-all duration-200 ease-in-out flex items-center justify-center gap-2"
            >
                {isRunning ? (
                    <>
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Running Scan...
                    </>
                ) : (
                    'Start Scan'
                )}
            </button>
        </div>
    );
};

export default ControlPanel;