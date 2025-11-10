import React from 'react';

const Welcome: React.FC = () => {
    return (
        <div className="bg-gray-800 p-8 rounded-lg shadow-lg text-center">
            <h1 className="text-4xl font-bold mb-4 text-white">Welcome to the HAST Agent Visualizer</h1>
            <p className="text-lg text-white">
                This tool helps you visualize the process of a HAST (Hybrid Application Security Testing) agent.
                Upload your source code (in a ZIP file) to begin.
            </p>
        </div>
    );
};

export default Welcome;
