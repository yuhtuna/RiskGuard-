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

export type SastFinding = { file: string; line: number; flaw: string; vulnerability_type: string };
export type DastFinding = { status: 'SUCCESS' | 'FAILURE'; proof_of_exploit: string | null };

export type FinalReport = {
    status: 'VULNERABILITY_CONFIRMED';
    dastReport: DastFinding[];
    sastReport: SastFinding[];
} | {
    status: 'POTENTIAL_VULNERABILITY';
    sastReport: SastFinding[];
} | {
    status: 'BUILD_FAILED';
    message: string;
} | null;


export interface HASTGraphState {
    source_code_url: string;
    sandbox_url: string;
    build_status: 'PENDING' | 'SUCCESS' | 'FAILURE';
    sast_report: SastFinding[];
    attack_plan: { target_url: string; vulnerability_type: string; payload: string }[];
    dast_report: DastFinding[];
    final_report: FinalReport;
}

export type Theme = 'light' | 'dark';

export interface ActionLog {
  key: NodeKey | string;
  title: string;
  status: NodeStatus;
  detailLogs: LogEntry[];
}