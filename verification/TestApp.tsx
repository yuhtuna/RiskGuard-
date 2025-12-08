
import React from 'react';
import VulnerabilityReport from '../pages/home/components/VulnerabilityReport';
import { createRoot } from 'react-dom/client';

const mockFix = {
    file_path: 'backend/auth.py',
    description: 'Fixed SQL Injection',
    patch: 'import sqlite3\n\n# Fixed code using parameterized query\ncursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))',
    educational_info: [
        {
            type: 'SQL Injection',
            explanation: 'SQL Injection allows an attacker to interfere with the queries that an application makes to its database.',
            remediation: 'Use parameterized queries or prepared statements instead of string concatenation.'
        }
    ]
};

const App = () => {
    return (
        <div className="p-10 h-screen w-screen bg-gray-100 dark:bg-gray-900">
            <VulnerabilityReport
                fixes={[mockFix]}
            />
        </div>
    );
};

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);
