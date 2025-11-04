import React from 'react';
import ThemeToggle from './ThemeToggle';
import type { Theme } from '../types';

interface HeaderProps {
    theme: Theme;
    onToggleTheme: () => void;
}

const Header: React.FC<HeaderProps> = ({ theme, onToggleTheme }) => {
    return (
        <header className="relative bg-white/80 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 p-4 shadow-md backdrop-blur-sm">
            <h1 className="text-xl md:text-2xl font-bold text-sky-600 dark:text-sky-400 text-center">
                HAST-Agent Workflow Visualizer
            </h1>
            <div className="absolute top-1/2 right-4 transform -translate-y-1/2">
                <ThemeToggle theme={theme} onToggle={onToggleTheme} />
            </div>
        </header>
    );
};

export default Header;