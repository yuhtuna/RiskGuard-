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
        <div className="flex h-screen w-full overflow-hidden relative transition-colors duration-500 font-sans text-navy-900 dark:text-gray-200">
            {/* Background Layer (Z-0) */}
            <AnimatedBackground isRunning={isRunning} />

            {/* Sidebar (Z-20) - Glassmorphism applied */}
            <aside className="w-64 flex-shrink-0 z-20 flex flex-col shadow-2xl transition-all duration-500
                bg-cream-100/70 dark:bg-navy-900/60 backdrop-blur-xl border-r border-white/20 dark:border-navy-700/50">

                {/* Branding */}
                <div className="p-6 flex items-center space-x-3 border-b border-navy-900/5 dark:border-white/5">
                    <div className={`p-2 rounded-xl shadow-lg transition-all duration-300 ${isRunning ? 'animate-pulse bg-navy-500 text-navy-900' : 'bg-navy-800 text-navy-500 dark:bg-navy-950'}`}>
                        <ShieldIcon className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="font-bold text-lg tracking-wider text-navy-900 dark:text-gray-100">HAST</h1>
                        <p className="text-[10px] text-navy-600 dark:text-gray-400 uppercase tracking-[0.2em] font-medium">Agent Visualizer</p>
                    </div>
                </div>

                {/* Navigation / Status Placeholder */}
                <nav className="flex-grow p-4 space-y-6 overflow-y-auto">
                    <div>
                        <div className="text-[10px] font-bold text-navy-400 dark:text-navy-500 uppercase tracking-widest mb-3 pl-1">System Status</div>
                        <div className={`
                            p-3 rounded-xl border flex items-center space-x-3 transition-all duration-300 shadow-sm
                            ${isRunning
                                ? 'bg-navy-500/10 border-navy-500/50 text-navy-900 dark:text-cream-100 shadow-[0_0_15px_rgba(100,255,218,0.1)]'
                                : 'bg-white/50 dark:bg-navy-800/50 border-gray-200 dark:border-navy-700 text-gray-500'}
                        `}>
                            <div className={`w-2.5 h-2.5 rounded-full ${isRunning ? 'bg-green-500 animate-ping' : 'bg-gray-400'}`} />
                            <span className="font-semibold text-sm">{isRunning ? 'Active Scan' : 'System Idle'}</span>
                        </div>

                        {statusMessage && (
                            <div className="mt-4 p-3 bg-white/40 dark:bg-black/20 backdrop-blur-sm border border-white/20 dark:border-white/5 rounded-lg text-xs font-mono text-center opacity-80">
                                {statusMessage}
                            </div>
                        )}
                    </div>
                </nav>

                {/* Footer Controls */}
                <div className="p-4 border-t border-navy-900/5 dark:border-white/5 bg-white/10 dark:bg-black/10">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-navy-500/80">Appearance</span>
                        <ThemeToggle theme={theme} toggleTheme={onToggleTheme} />
                    </div>
                </div>
            </aside>

            {/* Main Content (Z-10) */}
            <main className="flex-grow z-10 overflow-y-auto overflow-x-hidden relative scroll-smooth">
                 <div className="container mx-auto p-6 lg:p-10 max-w-7xl">
                    {children}
                 </div>
            </main>
        </div>
    );
};

export default DashboardLayout;
