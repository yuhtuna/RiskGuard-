import React from 'react';

const Welcome: React.FC = () => {
    return (
        <div className="relative group perspective-1000">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative p-8 md:p-12 bg-white/80 dark:bg-navy-800/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-white/10 flex flex-col items-center text-center space-y-6 transform transition-all duration-500 hover:scale-[1.01]">

                <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg mb-4 animate-float">
                    <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                </div>

                <h1 className="text-4xl md:text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 tracking-tight">
                    Secure Your Code with AI
                </h1>

                <p className="text-lg md:text-xl text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
                    Upload your source code to initiate an autonomous security audit.
                    <br className="hidden md:block"/>
                    RiskGuard analyzes, detects vulnerabilities, and generates patches automatically.
                </p>

                <div className="flex flex-wrap gap-4 mt-8 justify-center">
                    <div className="px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 text-sm font-semibold border border-blue-100 dark:border-blue-800 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        Static Analysis
                    </div>
                    <div className="px-4 py-2 rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 text-sm font-semibold border border-purple-100 dark:border-purple-800 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                        Dynamic Testing
                    </div>
                    <div className="px-4 py-2 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300 text-sm font-semibold border border-emerald-100 dark:border-emerald-800 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        Auto-Patching
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Welcome;
