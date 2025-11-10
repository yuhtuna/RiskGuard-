import React from 'react';
import type { NodeStatus, NodeKey } from '../../../types';
import { WORKFLOW_NODES } from '../../../constants';

interface WorkflowStepperProps {
    nodeStatuses: Record<NodeKey, NodeStatus>;
    activeNode: NodeKey | null;
}

const WorkflowStepper: React.FC<WorkflowStepperProps> = ({ nodeStatuses, activeNode }) => {
    const steps = Object.keys(WORKFLOW_NODES).filter(
        key =>
            key === 'deploy_sandbox' ||
            key === 'sast_scan' ||
            key === 'plan_attack' ||
            key === 'run_dast' ||
            key === 'destroy_sandbox'
    );

    return (
        <div className="flex items-center justify-center w-full">
            <div className="flex items-center">
                {steps.map((key, index) => {
                    const status = nodeStatuses[key as NodeKey];
                    const isActive = activeNode === key;
                    const isCompleted = status === 'success';
                    const isFailed = status === 'failure';

                    return (
                        <React.Fragment key={key}>
                            <div className="flex items-center">
                                <div
                                    className={`flex items-center justify-center w-10 h-10 rounded-full ${
                                        isActive
                                            ? 'bg-blue-500 text-white'
                                            : isCompleted
                                            ? 'bg-green-500 text-white'
                                            : isFailed
                                            ? 'bg-red-500 text-white'
                                            : 'bg-gray-300 dark:bg-gray-700'
                                    }`}
                                >
                                    {isCompleted ? '✔' : isFailed ? '✖' : index + 1}
                                </div>
                                <div className="ml-4">
                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                        {WORKFLOW_NODES[key as NodeKey].label}
                                    </div>
                                </div>
                            </div>
                            {index < steps.length - 1 && (
                                <div className="flex-auto border-t-2 border-gray-300 dark:border-gray-700 mx-4" />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
};

export default WorkflowStepper;
