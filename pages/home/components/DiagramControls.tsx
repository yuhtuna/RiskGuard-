import React from 'react';

interface DiagramControlsProps {
    onZoomIn: () => void;
    onZoomOut: () => void;
    onReset: () => void;
}

const DiagramControls: React.FC<DiagramControlsProps> = ({ onZoomIn, onZoomOut, onReset }) => {
    return (
        <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2">
            <div className="text-xs text-gray-500 dark:text-gray-400 bg-black/5 dark:bg-gray-900/50 p-2 rounded-md hidden md:block backdrop-blur-sm">
                Scroll to zoom, drag to pan
            </div>
            <div className="flex items-center bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-lg p-1 backdrop-blur-sm">
                <button onClick={onZoomIn} title="Zoom In" className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                </button>
                <button onClick={onZoomOut} title="Zoom Out" className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                    </svg>
                </button>
                <button onClick={onReset} title="Reset View" className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 3.75H6A2.25 2.25 0 0 0 3.75 6v1.5M16.5 3.75H18A2.25 2.25 0 0 1 20.25 6v1.5m0 9V18A2.25 2.25 0 0 1 18 20.25h-1.5m-9 0H6A2.25 2.25 0 0 1 3.75 18v-1.5M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default DiagramControls;