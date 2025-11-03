
import React from 'react';
import type { NodeStatus } from '../types';

interface WorkflowNodeProps {
    label: string;
    icon: React.ReactNode;
    position: { top: string; left: string };
    status: NodeStatus;
    isActive: boolean;
}

const WorkflowNode: React.FC<WorkflowNodeProps> = ({ label, icon, position, status, isActive }) => {
    const statusClasses: Record<NodeStatus, string> = {
        pending: 'bg-gray-700 border-gray-600 text-gray-400',
        active: 'bg-sky-900/50 border-sky-500 text-sky-300',
        success: 'bg-green-900/50 border-green-500 text-green-300',
        failure: 'bg-red-900/50 border-red-500 text-red-300',
    };

    const activeRing = isActive ? 'ring-2 ring-sky-400 ring-offset-2 ring-offset-gray-800' : '';
    const glow = isActive ? 'animate-pulse' : '';

    return (
        <div
            className={`group absolute transform -translate-x-1/2 -translate-y-1/2 p-3 rounded-lg border-2 shadow-lg flex flex-col items-center gap-2 w-40 transition-all duration-300 ${statusClasses[status]} ${activeRing}`}
            style={{ ...position, zIndex: 10 }}
        >
            {icon}
            <span className={`text-xs text-center font-semibold ${glow}`}>
                {label}
            </span>
        </div>
    );
};

export default WorkflowNode;
