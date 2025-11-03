
import React from 'react';

interface ResultPanelProps {
    report: string;
}

const ResultPanel: React.FC<ResultPanelProps> = ({ report }) => {
    let title = "Final Report";
    let titleColor = "text-sky-400";
    let parsedReport = report;

    if (report.startsWith("Exploit Found:")) {
        title = "Vulnerability Confirmed!";
        titleColor = "text-red-400";
        try {
            parsedReport = `Exploit Found:\n${JSON.stringify(JSON.parse(report.substring("Exploit Found:".length)), null, 2)}`;
        } catch (e) { /* ignore parse error */ }
    } else if (report.startsWith("SAST Flaw Found, Not Exploitable:")) {
        title = "Potential Vulnerability Found";
        titleColor = "text-yellow-400";
         try {
            parsedReport = `SAST Flaw Found, Not Exploitable:\n${JSON.stringify(JSON.parse(report.substring("SAST Flaw Found, Not Exploitable:".length)), null, 2)}`;
        } catch (e) { /* ignore parse error */ }
    } else if (report.startsWith("Build failed.")) {
        title = "Build Failed";
        titleColor = "text-gray-400";
    }

    return (
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 h-full flex flex-col">
            <h2 className={`text-lg font-semibold ${titleColor} border-b border-gray-600 pb-2 mb-2`}>{title}</h2>
            <div className="flex-grow overflow-y-auto bg-black rounded-md p-3">
                <pre className="text-gray-200 whitespace-pre-wrap break-all text-sm">
                    {parsedReport}
                </pre>
            </div>
        </div>
    );
};

export default ResultPanel;
