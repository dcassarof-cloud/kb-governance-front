// =====================================================
// TYPES / MODELS - Consisa KB Governance
// =====================================================

export interface DashboardSummary {
  totalArticles: number;
  articlesOk: number;
  articlesWithIssues: number;
  totalIssues: number;
  duplicatesCount: number;
  bySystem: SystemStats[];
  byStatus: StatusStats[];
}

export interface DashboardGovernanceDto {
  summary: DashboardGovernanceSummary;
  systemsAtRisk: DashboardGovernanceSystem[];
  overdueToday: DashboardGovernanceIssueItem[];
  unassigned: DashboardGovernanceIssueItem[];
  trends: DashboardGovernanceTrend[];
}

export interface DashboardGovernanceSummary {
  openIssues: number;
  errorIssues: number;
  overdueIssues: number;
  unassignedIssues: number;
  slaCompliancePercent: number;
}

export interface DashboardGovernanceSystem {
  systemCode: string;
  systemName: string;
  healthScore: number;
  errorIssues: number;
  overdueIssues: number;
  unassignedIssues: number;
}

export interface DashboardGovernanceIssueItem {
  id: string;
  title?: string | null;
  systemCode?: string | null;
  systemName?: string | null;
  type?: IssueType | string | null;
  severity?: IssueSeverity | string | null;
  slaDueAt?: string | null;
  createdAt?: string | null;
  slaDays?: number | null;
  ageDays?: number | null;
}

export interface DashboardGovernanceTrend {
  key: 'openIssues' | 'resolvedIssues' | 'sla';
  label: string;
  delta: number;
  direction: 'up' | 'down';
  context?: string | null;
}

export interface SystemStats {
  systemCode: string;
  systemName: string;
  total: number;
}

export interface StatusStats {
  status: GovernanceStatus;
  total: number;
}

export interface KbArticle {
  id: string;
  title: string;
  slug: string;
  manualLink: string;
  sourceSystem: string;
  sourceMenuId: string;
  sourceMenuName: string;
  systemId: string;
  systemCode: string;
  systemName: string;
  governanceStatus: GovernanceStatus;
  syncStatus: SyncStatus;
  createdDate: string;
  updatedDate: string;
  fetchedAt: string;
  contentHash: string;
}

export interface KbSystem {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  articlesCount: number;
  qualityScore: number;
}

export interface GovernanceOverviewDto {
  openTotal?: number | null;
  errorOpen?: number | null;
  criticalOpen?: number | null;
  unassignedOpen?: number | null;
  overdueOpen?: number | null;
  systems?: GovernanceOverviewSystemDto[];
}

export interface GovernanceOverviewSystemDto {
  systemCode: string;
  systemName?: string | null;
  healthScore?: number | null;
  openIssues?: number | null;
  errorOpen?: number | null;
  overdueOpen?: number | null;
  unassignedOpen?: number | null;
}

export interface GovernanceIssueDto {
  id: string;
  type: IssueType;
  typeDisplayName?: string | null;
  severity: IssueSeverity;
  priorityLevel?: IssueSeverity | null;
  articleId: string;
  articleTitle: string;
  systemCode: string;
  status: IssueStatus;
  createdAt: string;
  details: string;
  responsible?: string | null;
  responsibleId?: string | null;
  responsibleType?: string | null;
  responsibleName?: string | null;
  dueDate?: string | null;
  assignedAgentId?: string | null;
  assignedAgentName?: string | null;
  slaDueAt?: string | null;
  slaDays?: number | null;
  systemName?: string | null;
  message?: string | null;
  title?: string | null;
  duplicateHash?: string | null;
  displayName?: string | null;
  description?: string | null;
  recommendation?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface GovernanceIssueHistoryDto {
  id?: string;
  changedAt: string;
  field?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  changedBy?: string | null;
  note?: string | null;
  status?: IssueStatus | string | null;
}

export interface GovernanceSummary {
  totalIssues?: number | null;
  unassignedIssues?: number | null;
  openIssues?: number | null;
  resolvedLast7Days?: number | null;
}

export interface GovernanceResponsible {
  id?: string;
  name: string;
  email?: string | null;
  pendingIssues?: number | null;
  openIssues?: number | null;
  overdueIssues?: number | null;
  avgSlaDays?: number | null;
}

export interface GovernanceSuggestedAssignee {
  suggested: GovernanceResponsible | null;
  alternatives: GovernanceResponsible[];
}

export interface GovernanceResponsiblesSummary {
  totalResponsibles?: number | null;
  totalOpenIssues?: number | null;
  totalOverdue?: number | null;
  responsibles: GovernanceResponsible[];
}

export interface GovernanceManual {
  id: string;
  title: string;
  system: string;
  systemCode?: string;
  movideskLink: string;
  issueTypes: string[];
  status: string;
  risk: string;
  priority: string;
  responsible: string;
  dueDate: string | null;
}

export interface DuplicateGroup {
  hash: string;
  count: number;
  articles: DuplicateArticle[];
  status?: string;
}

export interface DuplicateArticle {
  id: string;
  title: string;
  systemCode: string;
  url: string;
  updatedAt: string;
}

export interface GovernanceIssueDetail extends GovernanceIssueDto {
  duplicateGroup?: DuplicateGroup | null;
  duplicates?: DuplicateArticle[];
  reason?: string | null;
}

export type GovernanceIssue = GovernanceIssueDto;

export interface IssueHistoryEntry {
  id: string;
  status: IssueStatus | string;
  changedAt: string;
  changedBy?: string | null;
  note?: string | null;
}

export interface SyncRun {
  id: string;
  startedAt: string;
  finishedAt: string | null;
  status: SyncRunStatus;
  mode: SyncModeLabel;
  note: string;
  stats: SyncStats;
}

export interface SyncStats {
  articlesProcessed: number;
  articlesCreated: number;
  articlesUpdated: number;
  errors: number;
}

export interface SyncConfig {
  id: string;
  enabled: boolean;
  mode: SyncMode;
  intervalMinutes: number;
  daysBack: number;
}

export interface NeedItem {
  id: string;
  protocol?: string | null;
  subject?: string | null;
  summary?: string | null;
  systemCode?: string | null;
  systemName?: string | null;
  status?: NeedStatus | null;
  severity?: IssueSeverity | null;
  occurrences?: number | null;
  lastOccurrenceAt?: string | null;
  windowStart?: string | null;
  windowEnd?: string | null;
  link?: string | null;
  reason?: string | null;
  quantity?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface NeedTicketExample {
  id?: string | null;
  title?: string | null;
  systemCode?: string | null;
  url?: string | null;
  createdAt?: string | null;
}

export interface NeedDetail extends NeedItem {
  examples?: NeedTicketExample[];
  description?: string | null;
}

// Enums
export type GovernanceStatus = 'OK' | 'WARNING' | 'ERROR' | 'PENDING';
export type SyncStatus = 'SYNCED' | 'PENDING' | 'FAILED' | 'OUTDATED';
export type IssueType =
  | 'REVIEW_REQUIRED'
  | 'NOT_AI_READY'
  | 'DUPLICATE_CONTENT'
  | 'INCOMPLETE_CONTENT';
export type IssueSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type IssueStatus = 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'IGNORED';
export type SyncRunStatus = 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export type SyncMode = 'FULL' | 'DELTA' | 'DELTA_WINDOW';
export type SyncModeLabel = SyncMode | 'DESCONHECIDO';
export type NeedStatus = string;

// Auth
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
}

export type UserRole = 'ADMIN' | 'MANAGER' | 'OPERATOR' | 'VIEWER';

export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
}

// API Response wrappers
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
}

export interface ApiError {
  status?: number;
  code: string;
  message: string;
  correlationId?: string;
  timestamp?: string;
  details?: string[];
}
