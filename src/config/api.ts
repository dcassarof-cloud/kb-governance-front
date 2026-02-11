// =====================================================
// API CONFIGURATION - Consisa KB Governance
// =====================================================

export const API_ENDPOINT = '/api/v1' as const;

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const resolveApiBaseUrl = (): string => {
  const envUrl = (import.meta.env.VITE_API_BASE_URL ?? '').trim();

  if (!envUrl) {
    throw new Error('VITE_API_BASE_URL não configurado. Ex.: https://api.consisa.com.br/api/v1');
  }

  const normalized = trimTrailingSlash(envUrl);
  if (!normalized.endsWith(API_ENDPOINT)) {
    throw new Error(`VITE_API_BASE_URL deve terminar com ${API_ENDPOINT}`);
  }

  return normalized;
};

export const API_BASE_URL = resolveApiBaseUrl();

export const API_ENDPOINTS = {
  LOGIN: '/auth/login',
  REFRESH: '/auth/refresh',
  LOGOUT: '/auth/logout',
  ME: '/auth/me',
  DASHBOARD_SUMMARY: '/dashboard/summary',
  DASHBOARD_GOVERNANCE: '/dashboard/governance',
  ARTICLES: '/articles',
  ARTICLE_BY_ID: (id: string | number) => `/articles/${id}`,
  GOVERNANCE_SUMMARY: '/governance/summary',
  GOVERNANCE_OVERVIEW: '/governance/overview',
  GOVERNANCE_MANUALS: '/governance/manuals',
  GOVERNANCE_ISSUES: '/governance/issues',
  GOVERNANCE_DUPLICATES: '/governance/duplicates',
  GOVERNANCE_ISSUE_BY_ID: (id: string | number) => `/governance/issues/${id}`,
  GOVERNANCE_ISSUE_ASSIGN: (id: string | number) => `/governance/issues/${id}/assignment`,
  GOVERNANCE_ISSUE_STATUS: (id: string | number) => `/governance/issues/${id}/status`,
  GOVERNANCE_ISSUE_IGNORE: (id: string | number) => `/governance/issues/${id}/ignore`,
  GOVERNANCE_ISSUE_REVALIDATE: (id: string | number) => `/governance/issues/${id}/revalidate`,
  GOVERNANCE_ISSUE_HISTORY: (id: string | number) => `/governance/issues/${id}/history`,
  GOVERNANCE_RESPONSIBLES_SUGGEST: '/responsibles/suggest',
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
  NEEDS: '/needs/recurring',
  NEEDS_BY_ID: (id: string | number) => `/needs/${id}`,
  NEEDS_CREATE_TASK: (id: string | number) => `/needs/${id}/tasks`,
  NEEDS_CREATE_MASTER_TICKET: (id: string | number) => `/needs/${id}/master-ticket`,
  SYSTEMS: '/systems',
  SYSTEM_BY_ID: (id: string | number) => `/systems/${id}`,
  SYNC_RUNS: '/sync/runs',
  SYNC_CONFIG: '/sync/config',
  SYNC_TRIGGER: '/sync/run',
  REPORTS_ARTICLES: '/reports/articles',
  REPORTS_ISSUES: '/reports/issues',
  REPORTS_SYSTEMS: '/reports/systems',
} as const;
