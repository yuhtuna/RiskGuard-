import React from 'react';

interface DashboardLayoutProps {
    sidebar: React.ReactNode;
    activeTask: React.ReactNode;
    taskHistory: React.ReactNode;
    mainContent: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ sidebar, activeTask, taskHistory, mainContent }) => {
    return (
        <div className="flex h-screen w-screen overflow-hidden bg-cream-50/90 dark:bg-navy-900/90">
            {/* Sidebar - Resizable width */}
            <aside className="hidden lg:flex flex-col w-72 min-w-[200px] max-w-[400px] resize-x overflow-hidden flex-shrink-0 bg-white/60 dark:bg-navy-800/60 backdrop-blur-xl border-r border-white/20 dark:border-white/10 shadow-xl z-20 relative group">
                <div className="flex-1 overflow-hidden p-0">
                    {sidebar}
                </div>
                {/* Visual drag handle indicator - Light grey ellipse */}
                <div className="absolute right-1 top-1/2 -translate-y-1/2 translate-x-1/2 z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                     <div className="w-1.5 h-12 bg-gray-300/80 dark:bg-gray-500/80 backdrop-blur-md rounded-full shadow-lg border border-white/40"></div>
                </div>
            </aside>

            {/* Main Content Area - Vertical Flex */}
            <main className="flex-1 flex flex-col min-w-0 h-full relative overflow-hidden">

                {/* Top Section: Active Task & History */}
                <div className="flex-none flex flex-col gap-2 p-3 pb-0 z-10">
                     {/* Active Task */}
                    <div className="w-full">
                        {activeTask}
                    </div>
                </div>

                {/* Middle Section: History - Resizable */}
                 <div className="flex-none h-48 min-h-[100px] max-h-[400px] resize-y overflow-hidden p-3 pt-2 z-0 relative group">
                    {taskHistory}
                    {/* Horizontal drag handle hint */}
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                         <div className="w-12 h-1.5 bg-gray-300/80 dark:bg-gray-500/80 backdrop-blur-md rounded-full shadow-lg border border-white/40"></div>
                    </div>
                </div>

                {/* Bottom Section: Report - Fills remaining space */}
                <div className="flex-1 min-h-0 overflow-hidden p-3 pt-0 pb-3">
                    <div className="h-full w-full bg-white/60 dark:bg-navy-800/60 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-white/10 shadow-xl overflow-hidden relative">
                        {mainContent}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default DashboardLayout;
