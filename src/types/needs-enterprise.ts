export type NeedStatus =
  | 'CREATED'
  | 'TRIAGED'
  | 'IN_PROGRESS'
  | 'BLOCKED'
  | 'DONE'
  | 'CANCELLED'
  | string;

export type NeedSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type NeedSource =
  | 'GOVERNANCE_ISSUE'
  | 'MANUAL_REQUEST'
  | 'TICKET_PATTERN'
  | 'AI_DETECTION'
  | 'ADMIN_CREATION';

export interface NeedMetricsSummaryResponse {
  totalOpen: number;
  triaged: number;
  inProgress: number;
  blocked: number;
  overdue: number;
  criticalOpen: number;
}

export interface NeedTriageRequest {
  actorUserId: number;
  severity: NeedSeverity;
  source: NeedSource;
  dueAt?: string;
  assigneeUserIds?: number[];
}

export interface NeedStatusActionRequest {
  actorUserId: number;
  comment?: string;
}

export interface NeedHistoryItemResponse {
  oldStatus?: string;
  newStatus: string;
  changedByUserId: number;
  changedAt: string;
  comment?: string;
}


export interface SupportImportRunResponse {
  message?: string;
  importedCount?: number;
  [key: string]: unknown;
}

export interface NeedsDebugCountsResponse {
  rulesActive: number;
  clusters: number;
  tickets: number;
  needsTotal: number;
  ticketsWithoutAssignee: number;
}

export interface NeedsTeamMetricsItem {
  teamId: number | string;
  teamName: string;
  needsTotal: number;
  openTotal: number;
  overdueTotal: number;
  criticalTotal: number;
}
