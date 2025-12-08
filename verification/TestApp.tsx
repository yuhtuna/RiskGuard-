
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

const mockGraphState = {
    pr_details: {
        title: 'fix(security): Fix SQL Injection',
        body: '## Executive Summary\nFixed critical SQL Injection in auth.py.\n\n## Changes\n- Parameterized query in login flow.\n\n## Verification\n- SAST/DAST verified.'
    }
};

const App = () => {
    return (
        <div className="p-10 h-screen w-screen bg-gray-100 dark:bg-gray-900 overflow-y-auto">
            <VulnerabilityReport
                fixes={[mockFix]}
                graphState={mockGraphState}
                onCreatePR={() => alert('PR Created!')}
            />
        </div>
    );
};

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);
