
import type { WORKFLOW_NODES } from './constants';

export type NodeStatus = 'pending' | 'active' | 'success' | 'failure';

export type NodeKey = keyof typeof WORKFLOW_NODES;

export type LogType = 'info' | 'success' | 'failure' | 'agent';

export interface LogEntry {
    message: string;
    type: LogType;
    timestamp: string;
}

export interface HASTGraphState {
    source_code_url: string;
    sandbox_url: string;
    build_status: 'PENDING' | 'SUCCESS' | 'FAILURE';
    sast_report: { file: string; line: number; flaw: string; vulnerability_type: string }[];
    attack_plan: { target_url: string; vulnerability_type: string; payload: string }[];
    dast_report: { status: 'SUCCESS' | 'FAILURE'; proof_of_exploit: string | null }[];
    final_report: string;
}
