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
    const [activeTaskHeight, setActiveTaskHeight] = useState(220); // Default height for active task
    
    const [isResizingSidebar, setIsResizingSidebar] = useState(false);
    const [isResizingHistory, setIsResizingHistory] = useState(false);
    const [isResizingActiveTask, setIsResizingActiveTask] = useState(false);

    // Refs for drag calculations
    const dragStart = useRef<{ x: number; y: number; w: number; h: number } | null>(null);

    // Limits
    const minSidebarWidth = 240;
    const maxSidebarWidth = 500;
    const collapseSidebarThreshold = 100;
    const collapsedSidebarWidth = 24;

    const minHistoryHeight = 150;
    const maxHistoryHeight = 500;
    const collapseHistoryThreshold = 80;
    const collapsedHistoryHeight = 20;

    const minActiveTaskHeight = 100;
    const maxActiveTaskHeight = 600;
    const collapseActiveTaskThreshold = 80;
    const collapsedActiveTaskHeight = 20;

    const startResizingSidebar = (e: React.MouseEvent) => {
        setIsResizingSidebar(true);
        dragStart.current = { x: e.clientX, y: e.clientY, w: sidebarWidth, h: 0 };
        e.preventDefault();
    };

    const startResizingHistory = (e: React.MouseEvent) => {
        setIsResizingHistory(true);
        dragStart.current = { x: e.clientX, y: e.clientY, w: 0, h: historyHeight };
        e.preventDefault();
    };

    const startResizingActiveTask = (e: React.MouseEvent) => {
        setIsResizingActiveTask(true);
        dragStart.current = { x: e.clientX, y: e.clientY, w: 0, h: activeTaskHeight };
        e.preventDefault();
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!dragStart.current) return;

            if (isResizingSidebar) {
                const newWidth = e.clientX; // Absolute position for sidebar
                if (newWidth < collapseSidebarThreshold) {
                    setSidebarWidth(collapsedSidebarWidth);
                } else {
                    const effectiveWidth = Math.max(minSidebarWidth, newWidth);
                    if (effectiveWidth <= maxSidebarWidth) {
                        setSidebarWidth(effectiveWidth);
                    }
                }
            }

            if (isResizingHistory) {
                const deltaY = e.clientY - dragStart.current.y;
                const potentialHeight = dragStart.current.h + deltaY;
                
                if (potentialHeight < collapseHistoryThreshold) {
                    setHistoryHeight(collapsedHistoryHeight);
                } else {
                    const effectiveHeight = Math.max(minHistoryHeight, potentialHeight);
                    if (effectiveHeight <= maxHistoryHeight) {
                        setHistoryHeight(effectiveHeight);
                    }
                }
            }

            if (isResizingActiveTask) {
                const deltaY = e.clientY - dragStart.current.y;
                const potentialHeight = dragStart.current.h + deltaY;
                
                if (potentialHeight < collapseActiveTaskThreshold) {
                    setActiveTaskHeight(collapsedActiveTaskHeight);
                } else {
                    const effectiveHeight = Math.max(minActiveTaskHeight, potentialHeight);
                    if (effectiveHeight <= maxActiveTaskHeight) {
                        setActiveTaskHeight(effectiveHeight);
                    }
                }
            }
        };

        const handleMouseUp = () => {
            setIsResizingSidebar(false);
            setIsResizingHistory(false);
            setIsResizingActiveTask(false);
            dragStart.current = null;
        };

        if (isResizingSidebar || isResizingHistory || isResizingActiveTask) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = isResizingSidebar ? 'col-resize' : 'row-resize';
            document.body.style.userSelect = 'none';
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
    }, [isResizingSidebar, isResizingHistory, isResizingActiveTask]);

    const isSidebarCollapsed = sidebarWidth <= collapsedSidebarWidth;
    const isHistoryCollapsed = historyHeight <= collapsedHistoryHeight;
    const isActiveTaskCollapsed = activeTaskHeight <= collapsedActiveTaskHeight;

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-cream-50/90 dark:bg-navy-900/90">
            {/* Sidebar - Resizable width */}
            <aside
                className={`hidden lg:flex flex-col flex-shrink-0 z-20 relative group transition-all duration-200 ease-out ${isSidebarCollapsed ? 'p-0' : 'p-3 pr-0'}`}
                style={{ width: sidebarWidth }}
            >
                <div className={`flex-1 overflow-hidden h-full bg-white/60 dark:bg-navy-800/60 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-xl rounded-2xl relative transition-opacity duration-200 ${isSidebarCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                    {sidebar}
                </div>

                {/* Visual drag handle indicator - Light grey ellipse */}
                <div
                    className={`absolute top-1/2 -translate-y-1/2 z-50 cursor-col-resize p-2 group-hover:opacity-100 transition-opacity duration-300 ${isSidebarCollapsed ? 'right-0 opacity-100' : 'right-[-6px] opacity-0'}`}
                    onMouseDown={startResizingSidebar}
                >
                     <div className="flex flex-col items-center gap-2">
                        <div className="h-80 w-[2px] rounded-full bg-gray-300/50 dark:bg-gray-600/50 backdrop-blur-sm transition-all duration-500"></div>
                        <div className={`w-1.5 h-12 bg-gray-300/80 dark:bg-gray-500/80 backdrop-blur-md rounded-full shadow-lg border border-white/40 transition-all duration-300 hover:bg-blue-400 dark:hover:bg-blue-500 hover:scale-y-110 ${isSidebarCollapsed ? 'bg-blue-400/80 dark:bg-blue-500/80' : ''}`}></div>
                        <div className="h-80 w-[2px] rounded-full bg-gray-300/50 dark:bg-gray-600/50 backdrop-blur-sm transition-all duration-500"></div>
                     </div>
                </div>
            </aside>

            {/* Main Content Area - Vertical Flex */}
            <main className="flex-1 flex flex-col min-w-0 h-full relative overflow-hidden">

                {/* Top Section: Active Task & History */}
                <div className="flex-none flex flex-col gap-2 p-3 pb-0 z-10">
                     {/* Active Task - Resizable */}
                    <div 
                        className={`w-full relative group transition-all duration-200 ease-out ${isActiveTaskCollapsed ? 'p-0' : ''}`}
                        style={{ height: activeTaskHeight }}
                    >
                        <div className={`h-full overflow-hidden transition-opacity duration-200 ${isActiveTaskCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                            {activeTask}
                        </div>
                        
                        {/* Horizontal drag handle hint for Active Task */}
                        <div
                            className={`absolute left-1/2 -translate-x-1/2 z-50 cursor-row-resize p-2 group-hover:opacity-100 transition-opacity duration-300 ${isActiveTaskCollapsed ? 'bottom-0 opacity-100' : 'bottom-[-8px] opacity-0'}`}
                            onMouseDown={startResizingActiveTask}
                        >
                             <div className="flex items-center gap-2">
                                <div className="w-80 h-[2px] rounded-full bg-gray-300/50 dark:bg-gray-600/50 backdrop-blur-sm transition-all duration-500"></div>
                                <div className={`w-12 h-1.5 bg-gray-300/80 dark:bg-gray-500/80 backdrop-blur-md rounded-full shadow-lg border border-white/40 transition-all duration-300 hover:bg-blue-400 dark:hover:bg-blue-500 hover:scale-x-110 ${isActiveTaskCollapsed ? 'bg-blue-400/80 dark:bg-blue-500/80' : ''}`}></div>
                                <div className="w-80 h-[2px] rounded-full bg-gray-300/50 dark:bg-gray-600/50 backdrop-blur-sm transition-all duration-500"></div>
                             </div>
                        </div>
                    </div>

                    {/* Middle Section: History - Resizable */}
                     <div
                        className={`flex-none z-0 relative group transition-all duration-200 ease-out ${isHistoryCollapsed ? 'p-0' : 'p-3 pt-2'}`}
                        style={{ height: historyHeight }}
                     >
                        <div className={`h-full overflow-hidden transition-opacity duration-200 ${isHistoryCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                            {taskHistory}
                        </div>
                        {/* Horizontal drag handle hint */}
                        <div
                            className={`absolute left-1/2 -translate-x-1/2 z-50 cursor-row-resize p-2 group-hover:opacity-100 transition-opacity duration-300 ${isHistoryCollapsed ? 'bottom-0 opacity-100' : 'bottom-1 opacity-0'}`}
                            onMouseDown={startResizingHistory}
                        >
                             <div className="flex items-center gap-2">
                                <div className="w-80 h-[2px] rounded-full bg-gray-300/50 dark:bg-gray-600/50 backdrop-blur-sm transition-all duration-500"></div>
                                <div className={`w-12 h-1.5 bg-gray-300/80 dark:bg-gray-500/80 backdrop-blur-md rounded-full shadow-lg border border-white/40 transition-all duration-300 hover:bg-blue-400 dark:hover:bg-blue-500 hover:scale-x-110 ${isHistoryCollapsed ? 'bg-blue-400/80 dark:bg-blue-500/80' : ''}`}></div>
                                <div className="w-80 h-[2px] rounded-full bg-gray-300/50 dark:bg-gray-600/50 backdrop-blur-sm transition-all duration-500"></div>
                             </div>
                        </div>
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
