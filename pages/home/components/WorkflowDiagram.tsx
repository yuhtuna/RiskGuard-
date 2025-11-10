import React, { useRef, useState, useLayoutEffect, useCallback } from 'react';
import WorkflowNode from './WorkflowNode';
import WorkflowEdge from './WorkflowEdge';
import DiagramControls from './DiagramControls';
import { WORKFLOW_NODES, WORKFLOW_EDGES } from '../../../constants';
import type { NodeStatus, NodeKey, EdgeStatus } from '../../../types';

interface WorkflowDiagramProps {
    nodeStatuses: Record<NodeKey, NodeStatus>;
    activeNode: NodeKey | null;
}

const MIN_SCALE = 0.2;
const MAX_SCALE = 2;

const WorkflowDiagram: React.FC<WorkflowDiagramProps> = ({ nodeStatuses, activeNode }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState({ width: 0, height: 0 });
    const [viewState, setViewState] = useState({ x: 0, y: 0, scale: 1 });
    const isPanning = useRef(false);
    const panStart = useRef({ x: 0, y: 0 });
    
    const resetView = useCallback(() => {
        if (!containerRef.current) return;
        const { width, height } = containerRef.current.getBoundingClientRect();
        
        // Calculate a scale that attempts to fit the diagram view
        const diagramWidth = 1000; 
        const diagramHeight = 800;
        const scaleX = width / diagramWidth;
        const scaleY = height / diagramHeight;
        const initialScale = Math.min(scaleX, scaleY, 0.8);
        
        setViewState({
            scale: initialScale,
            x: (width - diagramWidth * initialScale) / 2,
            y: (height - diagramHeight * initialScale) / 2 + 20, // A bit of vertical offset
        });
    }, []);

    useLayoutEffect(() => {
        const element = containerRef.current;
        if (!element) return;

        const resizeObserver = new ResizeObserver(entries => {
            if (!entries || entries.length === 0) return;
            const { width, height } = entries[0].contentRect;
            setSize({ width, height });
            resetView();
        });

        resizeObserver.observe(element);
        // Initial call
        resetView();
        
        return () => resizeObserver.unobserve(element);
    }, [resetView]);
    
    const handleWheel = useCallback((e: React.WheelEvent) => {
        // e.preventDefault(); // This line is causing the passive listener warning
        const { deltaY } = e;
        const scaleAmount = -deltaY * 0.001;
        const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, viewState.scale * (1 + scaleAmount)));

        const rect = e.currentTarget.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const newX = mouseX - (mouseX - viewState.x) * (newScale / viewState.scale);
        const newY = mouseY - (mouseY - viewState.y) * (newScale / viewState.scale);

        setViewState({ x: newX, y: newY, scale: newScale });
    }, [viewState]);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        isPanning.current = true;
        panStart.current = { x: e.clientX - viewState.x, y: e.clientY - viewState.y };
        if (e.currentTarget) {
           (e.currentTarget as HTMLDivElement).style.cursor = 'grabbing';
           (e.currentTarget as HTMLDivElement).style.userSelect = 'none';
        }
    }, [viewState.x, viewState.y]);

    const handleMouseUp = useCallback((e: React.MouseEvent) => {
        isPanning.current = false;
        if (e.currentTarget) {
            (e.currentTarget as HTMLDivElement).style.cursor = 'grab';
            (e.currentTarget as HTMLDivElement).style.userSelect = 'auto';
        }
    }, []);
    
    const handleMouseEnter = useCallback(() => {
        document.body.classList.add('no-scroll');
    }, []);

    const handleMouseLeave = useCallback((e: React.MouseEvent) => {
        handleMouseUp(e);
        document.body.classList.remove('no-scroll');
    }, [handleMouseUp]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isPanning.current) return;
        e.preventDefault();
        const newX = e.clientX - panStart.current.x;
        const newY = e.clientY - panStart.current.y;
        setViewState(prev => ({ ...prev, x: newX, y: newY }));
    }, []);

    const zoom = (direction: 'in' | 'out') => {
        const scaleMultiplier = direction === 'in' ? 1.2 : 1 / 1.2;
        const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, viewState.scale * scaleMultiplier));
        
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const newX = centerX - (centerX - viewState.x) * (newScale / viewState.scale);
        const newY = centerY - (centerY - viewState.y) * (newScale / viewState.scale);

        setViewState({ x: newX, y: newY, scale: newScale });
    };

    return (
        <div 
            ref={containerRef} 
            className="w-full h-full relative overflow-hidden bg-slate-200/50 dark:bg-gray-900/20 cursor-grab touch-none rounded-md"
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            onMouseEnter={handleMouseEnter}
            onMouseMove={handleMouseMove}
        >
            <div
                className="w-full h-full"
                style={{
                    transform: `translate(${viewState.x}px, ${viewState.y}px) scale(${viewState.scale})`,
                    transformOrigin: '0 0',
                }}
            >
                <svg className="absolute top-0 left-0 w-full h-full" style={{ zIndex: 0 }}>
                    {WORKFLOW_EDGES.map((edge, index) => {
                        const fromNode = WORKFLOW_NODES[edge.from];
                        const toNode = WORKFLOW_NODES[edge.to];
                        const fromStatus = nodeStatuses[edge.from];
                        const toStatus = nodeStatuses[edge.to];
                        
                        let status: EdgeStatus = 'inactive';
                        if (fromStatus === 'success' || fromStatus === 'failure') {
                            if (toStatus === 'active') {
                                status = 'active';
                            } else if (toStatus === 'success' || toStatus === 'failure') {
                                status = 'completed';
                            }
                        }
                        
                        return (
                            <WorkflowEdge
                                key={index}
                                from={fromNode.position}
                                to={toNode.position}
                                label={edge.label}
                                isConditional={edge.isConditional}
                                status={status}
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
            <DiagramControls 
                onZoomIn={() => zoom('in')}
                onZoomOut={() => zoom('out')}
                onReset={resetView}
            />
        </div>
    );
};

export default WorkflowDiagram;