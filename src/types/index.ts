// =====================================================
// TYPES / MODELS - Consisa KB Governance
// =====================================================

export interface DashboardSummary {
  totalArticles: number;
  okCount: number;
  issuesCount: number;
  duplicatesCount: number;
  bySystem: SystemStats[];
  byStatus: StatusStats[];
}

export interface SystemStats {
  systemCode: string;
  systemName: string;
  count: number;
}

export interface StatusStats {
  status: GovernanceStatus;
  count: number;
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

export interface GovernanceIssue {
  id: string;
  type: IssueType;
  severity: IssueSeverity;
  articleId: string;
  articleTitle: string;
  systemCode: string;
  status: IssueStatus;
  createdAt: string;
  details: string;
}

export interface GovernanceSummary {
  openIssues: number;
  criticalManuals: number;
  slaBreached: number;
  aiReadyPercentage: number;
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
  articles: KbArticle[];
}

export interface SyncRun {
  id: string;
  startedAt: string;
  finishedAt: string | null;
  status: SyncRunStatus;
  mode: SyncMode;
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

// Enums
export type GovernanceStatus = 'OK' | 'WARNING' | 'ERROR' | 'PENDING';
export type SyncStatus = 'SYNCED' | 'PENDING' | 'FAILED' | 'OUTDATED';
export type IssueType = 'MISSING_CONTENT' | 'BROKEN_LINK' | 'OUTDATED' | 'DUPLICATE' | 'FORMAT_ERROR';
export type IssueSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type IssueStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'IGNORED';
export type SyncRunStatus = 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export type SyncMode = 'FULL' | 'INCREMENTAL' | 'DELTA';

// Auth
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
}

export type UserRole = 'ADMIN' | 'OPERATOR' | 'VIEWER';

export interface AuthState {
  user: User | null;
  token: string | null;
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
  code: string;
  message: string;
  details?: Record<string, string>;
}
