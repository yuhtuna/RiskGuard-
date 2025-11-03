
import React from 'react';
import type { HASTGraphState } from '../types';

interface StatePanelProps {
    graphState: Partial<HASTGraphState>;
}

const StatePanel: React.FC<StatePanelProps> = ({ graphState }) => {
    return (
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 flex-grow flex flex-col">
            <h2 className="text-lg font-semibold text-gray-300 border-b border-gray-600 pb-2 mb-2">Graph State</h2>
            <div className="flex-grow overflow-auto bg-gray-900 rounded-md p-2 text-sm">
                <pre className="text-sky-300 whitespace-pre-wrap break-all">
                    {Object.keys(graphState).length > 0 ? JSON.stringify(graphState, null, 2) : '{ }'}
                </pre>
            </div>
        </div>
    );
};

export default StatePanel;
