import type { WORKFLOW_NODES } from './constants';

export type NodeStatus = 'pending' | 'active' | 'success' | 'failure';

export type NodeKey = keyof typeof WORKFLOW_NODES;

export type EdgeStatus = 'inactive' | 'active' | 'completed';

export type LogType = 'info' | 'success' | 'failure' | 'agent';

export interface LogEntry {
    message: string;
    type: LogType;
    timestamp: string;
}

export type SastFinding = {
    file: string;
    line: number;
    flaw: string;
    vulnerability_type: string;
    explanation?: string;
    remediation?: string;
};
export type DastFinding = { status: 'SUCCESS' | 'FAILURE'; proof_of_exploit: string | null };

export type FinalReport = {
    status: 'VULNERABILITY_CONFIRMED';
    dastReport?: DastFinding[];
    sastReport?: SastFinding[];
    pr_url?: string;
    summary?: string;
    evidence_link?: string;
    raindrop_link?: string;
} | {
    status: 'POTENTIAL_VULNERABILITY';
    sastReport?: SastFinding[];
    pr_url?: string;
    summary?: string;
    evidence_link?: string;
    raindrop_link?: string;
} | {
    status: 'BUILD_FAILED';
    message: string;
    pr_url?: string;
    summary?: string;
    evidence_link?: string;
    raindrop_link?: string;
} | {
    status: 'SECURE_VERIFIED';
    pr_url?: string;
    summary?: string;
    evidence_link?: string;
    raindrop_link?: string;
} | null;

export type EducationalInfo = {
    type: string;
    explanation: string;
    remediation: string;
};

export type SuggestedFix = {
    file_path: string;
    description: string;
    patch?: string;
    diff?: string;
    fixed_content?: string;
    educational_info?: EducationalInfo[];
};

export interface HASTGraphState {
    source_code_url: string;
    sandbox_url: string;
    build_status: 'PENDING' | 'SUCCESS' | 'FAILURE';
    sast_report: SastFinding[];
    suggested_fixes: SuggestedFix[];
    attack_plan: { target_url: string; vulnerability_type: string; payload: string }[];
    dast_report: { vulnerabilities: DastFinding[]; summary: string };
    final_report: FinalReport;
    pr_details?: { title: string; body: string };
}

export type Theme = 'light' | 'dark';

export interface ActionLog {
    id: string;
    key: NodeKey | string;
    title: string;
    status: NodeStatus;
    detailLogs: LogEntry[];
}