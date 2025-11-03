import React, { useRef, useState, useLayoutEffect } from 'react';
import WorkflowNode from './WorkflowNode';
import WorkflowEdge from './WorkflowEdge';
import { WORKFLOW_NODES, WORKFLOW_EDGES } from '../constants';
import type { NodeStatus, NodeKey } from '../types';

interface WorkflowDiagramProps {
    nodeStatuses: Record<NodeKey, NodeStatus>;
    activeNode: NodeKey | null;
}

const WorkflowDiagram: React.FC<WorkflowDiagramProps> = ({ nodeStatuses, activeNode }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState({ width: 0, height: 0 });

    useLayoutEffect(() => {
        const element = containerRef.current;
        if (!element) return;

        const resizeObserver = new ResizeObserver(entries => {
            if (!entries || entries.length === 0) return;
            const { width, height } = entries[0].contentRect;
            setSize({ width, height });
        });

        resizeObserver.observe(element);
        return () => resizeObserver.unobserve(element);
    }, []);

    return (
        <div ref={containerRef} className="w-full h-full relative">
             <svg className="absolute top-0 left-0 w-full h-full" style={{ zIndex: 0 }}>
                {WORKFLOW_EDGES.map((edge, index) => {
                    const fromNode = WORKFLOW_NODES[edge.from];
                    const toNode = WORKFLOW_NODES[edge.to];
                    const fromStatus = nodeStatuses[edge.from];
                    const toStatus = nodeStatuses[edge.to];

                    const isActive = (fromStatus === 'success' || fromStatus === 'failure') && (toStatus !== 'pending');
                    
                    return (
                        <WorkflowEdge
                            key={index}
                            from={fromNode.position}
                            to={toNode.position}
                            label={edge.label}
                            isConditional={edge.isConditional}
                            isActive={isActive}
                            containerSize={size}
                        />
                    );
                })}
            </svg>
            {Object.entries(WORKFLOW_NODES).map(([key, node]) => (
                <WorkflowNode
                    key={key}
                    label={node.label}
                    icon={node.icon}
                    position={node.position}
                    status={nodeStatuses[key as NodeKey]}
                    isActive={activeNode === key}
                />
            ))}
        </div>
    );
};

export default WorkflowDiagram;