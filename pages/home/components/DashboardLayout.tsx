import React from 'react';
import { ShieldIcon } from './Icons';
import ThemeToggle from './ThemeToggle';
import AnimatedBackground from './AnimatedBackground';

interface DashboardLayoutProps {
    children: React.ReactNode;
    theme: string;
    onToggleTheme: () => void;
    isRunning: boolean;
    statusMessage?: string;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
    children,
    theme,
    onToggleTheme,
    isRunning,
    statusMessage
}) => {
    return (
        <div className="flex h-screen w-full bg-cream-50 dark:bg-navy-900 text-cream-800 dark:text-gray-200 overflow-hidden relative transition-colors duration-500">
            <AnimatedBackground isRunning={isRunning} />

            {/* Sidebar */}
            <aside className="w-64 flex-shrink-0 z-10 bg-cream-100 dark:bg-navy-800 border-r border-cream-200 dark:border-navy-700 flex flex-col shadow-xl transition-colors duration-500">
                {/* Branding */}
                <div className="p-6 flex items-center space-x-3 border-b border-cream-200 dark:border-navy-700">
                    <div className={`p-2 rounded-lg ${isRunning ? 'animate-pulse bg-navy-500 text-navy-900' : 'bg-navy-700 text-navy-500 dark:bg-navy-900'}`}>
                        <ShieldIcon className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="font-bold text-lg tracking-wider text-navy-800 dark:text-gray-100">HAST</h1>
                        <p className="text-xs text-navy-800/60 dark:text-gray-400 uppercase tracking-widest">Agent Visualizer</p>
                    </div>
                </div>

                {/* Navigation / Status Placeholder */}
                <nav className="flex-grow p-4 space-y-4">
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Status</div>
                    <div className={`
                        p-3 rounded-md border flex items-center space-x-3 transition-all duration-300
                        ${isRunning
                            ? 'bg-navy-500/10 border-navy-500 text-navy-800 dark:text-navy-500 shadow-[0_0_15px_rgba(100,255,218,0.1)]'
                            : 'bg-transparent border-transparent text-gray-500'}
                    `}>
                        <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-navy-500 animate-ping' : 'bg-gray-400'}`} />
                        <span className="font-medium">{isRunning ? 'System Active' : 'System Idle'}</span>
                    </div>

                    {statusMessage && (
                        <div className="mt-4 p-3 bg-cream-200 dark:bg-navy-900/50 rounded text-sm text-center animate-pulse">
                            {statusMessage}
                        </div>
                    )}
                </nav>

                {/* Footer Controls */}
                <div className="p-4 border-t border-cream-200 dark:border-navy-700">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-500">Theme</span>
                        <ThemeToggle theme={theme} toggleTheme={onToggleTheme} />
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-grow z-10 overflow-y-auto overflow-x-hidden relative">
                 <div className="container mx-auto p-6 lg:p-10 max-w-7xl">
                    {children}
                 </div>
            </main>
        </div>
    );
};

export default DashboardLayout;
