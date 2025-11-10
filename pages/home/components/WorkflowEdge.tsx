import React from 'react';
import type { EdgeStatus } from '../types';

interface WorkflowEdgeProps {
    from: { top: string; left: string };
    to: { top: string; left: string };
    label?: string;
    isConditional?: boolean;
    status: EdgeStatus;
    containerSize: { width: number; height: number };
}

const WorkflowEdge: React.FC<WorkflowEdgeProps> = ({ from, to, label, isConditional, status, containerSize }) => {
    if (containerSize.width === 0 || containerSize.height === 0) {
        return null;
    }

    // Convert percentage strings to fractions
    const fromPos = { x: parseFloat(from.left) / 100, y: parseFloat(from.top) / 100 };
    const toPos = { x: parseFloat(to.left) / 100, y: parseFloat(to.top) / 100 };

    // Convert fractional positions to pixel coordinates
    const p1 = { x: fromPos.x * containerSize.width, y: fromPos.y * containerSize.height };
    const p2 = { x: toPos.x * containerSize.width, y: toPos.y * containerSize.height };
    
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;

    if (dx === 0 && dy === 0) return null;

    // Node dimensions are w-40 (160px) and height is ~80px based on content
    const nodeWidth = 160;
    const nodeHeight = 80;
    const gap = 5;
    
    const boxHalfWidth = (nodeWidth / 2) + gap;
    const boxHalfHeight = (nodeHeight / 2) + gap;

    let x1_px, y1_px, x2_px, y2_px;

    if (Math.abs(dx) < 0.001) {
        const yOffset = boxHalfHeight * Math.sign(dy);
        x1_px = p1.x;
        y1_px = p1.y + yOffset;
        x2_px = p2.x;
        y2_px = p2.y - yOffset;
    } else {
        const slope = dy / dx;
        if (Math.abs(slope) * boxHalfWidth > boxHalfHeight) {
            const yOffset = boxHalfHeight * Math.sign(dy);
            y1_px = p1.y + yOffset;
            x1_px = p1.x + yOffset / slope;
            y2_px = p2.y - yOffset;
            x2_px = p2.x - yOffset / slope;
        } else {
            const xOffset = boxHalfWidth * Math.sign(dx);
            x1_px = p1.x + xOffset;
            y1_px = p1.y + xOffset * slope;
            x2_px = p2.x - xOffset;
            y2_px = p2.y - xOffset * slope;
        }
    }

    const x1 = `${(x1_px / containerSize.width) * 100}%`;
    const y1 = `${(y1_px / containerSize.height) * 100}%`;
    const x2 = `${(x2_px / containerSize.width) * 100}%`;
    const y2 = `${(y2_px / containerSize.height) * 100}%`;
    
    const midX = (x1_px + x2_px) / 2 / containerSize.width * 100;
    const midY = (y1_px + y2_px) / 2 / containerSize.height * 100;

    const strokeColor = status === 'inactive' ? '#94a3b8' : '#0ea5e9'; // slate-400 or sky-500
    const markerId = `arrowhead-${status}`;

    return (
        <>
            <style>
                {`
                @keyframes flow {
                  to {
                    stroke-dashoffset: -20;
                  }
                }
                .edge-active-animation {
                  animation: flow 1s linear infinite;
                }
                :root { --edge-label-bg: #e2e8f0; }
                .dark { --edge-label-bg: #1f2937; }
                `}
            </style>
            <defs>
                <marker 
                    id={markerId} 
                    markerWidth="10" 
                    markerHeight="7" 
                    refX="9" 
                    refY="3.5" 
                    orient="auto"
                >
                    <polygon points="0 0, 10 3.5, 0 7" fill={strokeColor} className="transition-all duration-500" />
                </marker>
            </defs>
            <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={strokeColor}
                strokeWidth="2.5"
                strokeDasharray={status === 'active' ? "10, 10" : (isConditional ? "5, 5" : "none")}
                markerEnd={`url(#${markerId})`}
                className={`transition-all duration-500 ${status === 'active' ? 'edge-active-animation' : ''}`}
            />
            {label && (
                 <text
                    x={`${midX}%`}
                    y={`${midY}%`}
                    dy={fromPos.x === toPos.x ? 0 : -8}
                    dx={fromPos.x === toPos.x ? 8 : 0}
                    fill={strokeColor}
                    fontSize="12"
                    textAnchor="middle"
                    className="font-semibold transition-all duration-500"
                    paintOrder="stroke"
                    strokeWidth="3px"
                    stroke="var(--edge-label-bg, #e2e8f0)"
                >
                    {label}
                </text>
            )}
        </>
    );
};

export default WorkflowEdge;