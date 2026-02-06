// =====================================================
// API CONFIGURATION - Consisa KB Governance
// =====================================================

/**
 * Regra do projeto:
 * - apiBaseUrl SEMPRE termina em /api/v1 (definido pelo .env)
 * - API_ENDPOINTS são SEMPRE relativos (sem /api/v1)
 *
 * Exemplo final de URL:
 *   apiBaseUrl = http://localhost:8081/api/v1
 *   endpoint   = /dashboard/summary
 *   final      = http://localhost:8081/api/v1/dashboard/summary
 */
const resolveApiBaseUrl = (): string => {
  const envUrl = (import.meta.env.VITE_API_BASE_URL ?? '').trim();
  if (envUrl) return envUrl;
  if (import.meta.env.DEV) return 'http://localhost:8081/api/v1';
  throw new Error('VITE_API_BASE_URL não configurado para produção');
};

export const config = {
  // API base URL (definido por ambiente)
  apiBaseUrl: resolveApiBaseUrl(),

  // ✅ FIX: Desabilitar mock data para usar API real
  useMockData: false,

  // App info
  appName: 'Consisa KB Governance',
  appVersion: '1.0.0',

  // Auth
  tokenKey: 'kb_governance_token',
  refreshTokenKey: 'kb_governance_refresh_token',
  userKey: 'kb_governance_user',

  // Pagination defaults
  defaultPageSize: 10,
  pageSizeOptions: [10, 25, 50, 100],

  // ✅ FIX: Debug mode para ver logs
  debug: true,

  // Governance dates: backend format for dueDate payloads
  // - local-date: YYYY-MM-DD
  // - offset-datetime: YYYY-MM-DDT00:00:00-03:00
  governanceDueDateFormat: (import.meta.env.VITE_GOVERNANCE_DUE_DATE_FORMAT || 'offset-datetime') as
    | 'local-date'
    | 'offset-datetime',

} as const;

// =====================================================
// API Endpoints (RELATIVOS ao apiBaseUrl)
// =====================================================

export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/auth/login',
  REFRESH: '/auth/refresh',
  LOGOUT: '/auth/logout',
  ME: '/auth/me',

  // Dashboard
  DASHBOARD_SUMMARY: '/dashboard/summary',
  DASHBOARD_GOVERNANCE: '/dashboard/governance',

  // Articles
  ARTICLES: '/articles',
  ARTICLE_BY_ID: (id: string | number) => `/articles/${id}`,

  // Governance
  GOVERNANCE_SUMMARY: '/governance/summary',
  GOVERNANCE_OVERVIEW: '/governance/overview',
  GOVERNANCE_MANUALS: '/governance/manuals',
  GOVERNANCE_ISSUES: '/governance/issues',
  GOVERNANCE_DUPLICATES: '/governance/duplicates',
  GOVERNANCE_ISSUE_BY_ID: (id: string | number) => `/governance/issues/${id}`,
  GOVERNANCE_ISSUE_ASSIGN: (id: string | number) => `/governance/issues/${id}/assign`,
  GOVERNANCE_ISSUE_STATUS: (id: string | number) => `/governance/issues/${id}/status`,
  GOVERNANCE_ISSUE_HISTORY: (id: string | number) => `/governance/issues/${id}/history`,
  GOVERNANCE_ISSUE_SUGGESTED_ASSIGNEE: (id: string | number) => `/governance/issues/${id}/suggested-assignee`,
  GOVERNANCE_RESPONSIBLES_SUMMARY: '/governance/responsibles/summary',
  GOVERNANCE_MANUAL_ASSIGN: (id: string | number) => `/governance/manuals/${id}/assign`,
  GOVERNANCE_MANUAL_REVIEW: (id: string | number) => `/governance/manuals/${id}/review`,
  GOVERNANCE_MANUAL_MOVE: (id: string | number) => `/governance/manuals/${id}/move`,
  GOVERNANCE_MANUAL_MERGE: (id: string | number) => `/governance/manuals/${id}/merge`,
  GOVERNANCE_MANUAL_RESOLVE: (id: string | number) => `/governance/manuals/${id}/resolve`,
  GOVERNANCE_MANUAL_IGNORE: (id: string | number) => `/governance/manuals/${id}/ignore`,
  GOVERNANCE_DUPLICATES_PRIMARY: (hash: string | number) => `/governance/duplicates/${hash}/primary`,
  GOVERNANCE_DUPLICATES_IGNORE: (hash: string | number) => `/governance/duplicates/${hash}/ignore`,
  GOVERNANCE_DUPLICATES_MERGE: (hash: string | number) => `/governance/duplicates/${hash}/merge`,

  // Needs
  NEEDS: '/needs/recurring',
  NEEDS_BY_ID: (id: string | number) => `/needs/${id}`,
  NEEDS_CREATE_TASK: (id: string | number) => `/needs/${id}/tasks`,
  NEEDS_CREATE_MASTER_TICKET: (id: string | number) => `/needs/${id}/master-ticket`,

  // Systems
  SYSTEMS: '/systems',
  SYSTEM_BY_ID: (id: string | number) => `/systems/${id}`,

  // Sync
  SYNC_RUNS_LATEST: '/sync/runs/latest',
  SYNC_CONFIG: '/sync/config',
  SYNC_TRIGGER: '/sync/run',

  // Reports
  REPORTS_ARTICLES: '/reports/articles',
  REPORTS_ISSUES: '/reports/issues',
  REPORTS_SYSTEMS: '/reports/systems',

} as const;
