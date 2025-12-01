import React from 'react';
import ThemeToggle from './ThemeToggle';
import type { Theme } from '../types';

interface HeaderProps {
    theme: Theme;
    onToggleTheme: () => void;
}

const Header: React.FC<HeaderProps> = ({ theme, onToggleTheme }) => {
    return (
        <header className="sticky top-0 z-50 w-full border-b border-gray-200/20 dark:border-white/10 bg-white/70 dark:bg-navy-900/70 backdrop-blur-xl shadow-lg transition-all duration-300">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                <div className="flex items-center gap-3 group">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                         <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                    </div>
                    <h1 className="text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-800 to-gray-600 dark:from-white dark:to-gray-300 tracking-tight">
                        RiskGuard <span className="font-light text-blue-500">AI</span>
                    </h1>
                </div>

                <div className="flex items-center gap-4">
                    <div className="hidden md:flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 font-medium">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        System Active
                    </div>
                    <div className="h-6 w-px bg-gray-300 dark:bg-gray-700 mx-2"></div>
                    <ThemeToggle theme={theme} onToggle={onToggleTheme} />
                </div>
            </div>
        </header>
    );
};

export default Header;
