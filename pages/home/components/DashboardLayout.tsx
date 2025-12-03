import React, { useState, useRef, useEffect } from 'react';

interface DashboardLayoutProps {
    sidebar: React.ReactNode;
    activeTask: React.ReactNode;
    taskHistory: React.ReactNode;
    mainContent: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ sidebar, activeTask, taskHistory, mainContent }) => {
    const [sidebarWidth, setSidebarWidth] = useState(288); // 288px (w-72) default
    const [historyHeight, setHistoryHeight] = useState(192); // 192px (h-48) default
    const [isResizingSidebar, setIsResizingSidebar] = useState(false);
    const [isResizingHistory, setIsResizingHistory] = useState(false);

    // Limits
    const minSidebarWidth = 200;
    const maxSidebarWidth = 500;
    const minHistoryHeight = 100;
    const maxHistoryHeight = 500;

    const startResizingSidebar = (e: React.MouseEvent) => {
        setIsResizingSidebar(true);
        e.preventDefault();
    };

    const startResizingHistory = (e: React.MouseEvent) => {
        setIsResizingHistory(true);
        e.preventDefault();
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isResizingSidebar) {
                const newWidth = e.clientX;
                if (newWidth >= minSidebarWidth && newWidth <= maxSidebarWidth) {
                    setSidebarWidth(newWidth);
                }
            }

            if (isResizingHistory) {
                setHistoryHeight(prev => {
                   const newHeight = prev + e.movementY;
                   return Math.min(Math.max(newHeight, minHistoryHeight), maxHistoryHeight);
                });
            }
        };

        const handleMouseUp = () => {
            setIsResizingSidebar(false);
            setIsResizingHistory(false);
        };

        if (isResizingSidebar || isResizingHistory) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = isResizingSidebar ? 'col-resize' : 'row-resize';
            document.body.style.userSelect = 'none'; // Prevent text selection while dragging
        } else {
            document.body.style.cursor = 'default';
            document.body.style.userSelect = 'auto';
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'default';
            document.body.style.userSelect = 'auto';
        };
    }, [isResizingSidebar, isResizingHistory]);

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-cream-50/90 dark:bg-navy-900/90">
            {/* Sidebar - Resizable width */}
            <aside
                className="hidden lg:flex flex-col flex-shrink-0 z-20 relative group p-3 pr-0"
                style={{ width: sidebarWidth }}
            >
                <div className="flex-1 overflow-hidden h-full bg-white/60 dark:bg-navy-800/60 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-xl rounded-2xl relative">
                    {sidebar}
                </div>

                {/* Visual drag handle indicator - Light grey ellipse */}
                <div
                    className="absolute right-[-6px] top-1/2 -translate-y-1/2 z-50 cursor-col-resize p-2 group-hover:opacity-100 transition-opacity duration-300"
                    onMouseDown={startResizingSidebar}
                >
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
                 <div
                    className="flex-none p-3 pt-2 z-0 relative group"
                    style={{ height: historyHeight }}
                 >
                    <div className="h-full overflow-hidden">
                        {taskHistory}
                    </div>
                    {/* Horizontal drag handle hint */}
                    <div
                        className="absolute bottom-1 left-1/2 -translate-x-1/2 z-50 cursor-row-resize p-2 group-hover:opacity-100 transition-opacity duration-300"
                        onMouseDown={startResizingHistory}
                    >
                         <div className="w-12 h-1.5 bg-gray-300/80 dark:bg-gray-500/80 backdrop-blur-md rounded-full shadow-lg border border-white/40"></div>
                    </div>
                </div>

                {/* Bottom Section: Report - Fills remaining space */}
                <div className="flex-1 min-h-0 overflow-hidden p-3 pt-0 pb-3">
                    {/* Removed double wrapping. Now just a layout container. Child should handle styling. */}
                    <div className="h-full w-full overflow-hidden relative">
                        {mainContent}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default DashboardLayout;
