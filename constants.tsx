
import React from 'react';
import type { NodeKey } from './types';

const iconProps = {
    className: "h-8 w-8 text-gray-400 group-hover:text-sky-300 transition-colors"
};

export const WORKFLOW_NODES = {
    deploy_sandbox: {
        label: "Deploy Sandbox",
        icon: (<svg {...iconProps} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9V3m0 18a9 9 0 009-9M3 12a9 9 0 019-9m0 18a9 9 0 00-9-9m9 9h9" /></svg>),
        position: { top: '10%', left: '50%' },
    },
    sast_scan: {
        label: "SAST Scan",
        icon: (<svg {...iconProps} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 21h7a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v11m0 5l4.879-4.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242z" /></svg>),
        position: { top: '30%', left: '50%' },
    },
    plan_attack: {
        label: "Plan Attack",
        icon: (<svg {...iconProps} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 16.382V5.618a1 1 0 00-1.447-.894L15 7m-6 10h6" /></svg>),
        position: { top: '50%', left: '50%' },
    },
    run_dast: {
        label: "Run DAST",
        icon: (<svg {...iconProps} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>),
        position: { top: '70%', left: '50%' },
    },
    destroy_sandbox: {
        label: "Destroy Sandbox",
        icon: (<svg {...iconProps} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>),
        position: { top: '90%', left: '50%' },
    },
    report_build_failure: {
        label: "Report: Build Failed",
        icon: (<svg {...iconProps} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>),
        position: { top: '30%', left: '15%' },
    },
    report_exploit_found: {
        label: "Report: Exploit Found",
        icon: (<svg {...iconProps} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12 12 0 0012 21a12 12 0 008.618-4.969v.001z" /></svg>),
        position: { top: '70%', left: '15%' },
    },
    report_no_exploit: {
        label: "Report: Not Exploitable",
        icon: (<svg {...iconProps} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>),
        position: { top: '70%', left: '85%' },
    },
};

export const WORKFLOW_EDGES: { from: NodeKey; to: NodeKey; label?: string; isConditional?: boolean }[] = [
    { from: 'deploy_sandbox', to: 'sast_scan', label: 'Success' },
    { from: 'deploy_sandbox', to: 'report_build_failure', label: 'Failure', isConditional: true },
    { from: 'sast_scan', to: 'plan_attack' },
    { from: 'plan_attack', to: 'run_dast' },
    { from: 'run_dast', to: 'report_exploit_found', label: 'Success', isConditional: true },
    { from: 'run_dast', to: 'report_no_exploit', label: 'Failure', isConditional: true },
    { from: 'report_build_failure', to: 'destroy_sandbox' },
    { from: 'report_exploit_found', to: 'destroy_sandbox' },
    { from: 'report_no_exploit', to: 'destroy_sandbox' },
];
