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
export const config = {
  // API base URL (definido por ambiente)
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081/api/v1').trim(),

  // ✅ FIX: Desabilitar mock data para usar API real
  useMockData: false,

  // App info
  appName: 'Consisa KB Governance',
  appVersion: '1.0.0',

  // Auth
  tokenKey: 'kb_governance_token',
  userKey: 'kb_governance_user',

  // Pagination defaults
  defaultPageSize: 10,
  pageSizeOptions: [10, 25, 50, 100],

  // ✅ FIX: Debug mode para ver logs
  debug: true,

} as const;

// =====================================================
// API Endpoints (RELATIVOS ao apiBaseUrl)
// =====================================================

export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/auth/login',
  LOGOUT: '/auth/logout',
  ME: '/auth/me',

  // Dashboard
  DASHBOARD_SUMMARY: '/dashboard/summary',

  // Articles
  ARTICLES: '/articles',
  ARTICLE_BY_ID: (id: string | number) => `/articles/${id}`,

  // Governance
  GOVERNANCE_ISSUES: '/governance/issues',
  GOVERNANCE_DUPLICATES: '/governance/duplicates',
  GOVERNANCE_ISSUE_BY_ID: (id: string | number) => `/governance/issues/${id}`,

  // Systems
  SYSTEMS: '/systems',
  SYSTEM_BY_ID: (id: string | number) => `/systems/${id}`,

  // Sync
  SYNC_RUNS: '/sync/runs',
  SYNC_CONFIG: '/sync/config',
  SYNC_TRIGGER: '/sync/runs',

  // Reports
  REPORTS_ARTICLES: '/reports/articles',
  REPORTS_ISSUES: '/reports/issues',
  REPORTS_SYSTEMS: '/reports/systems',

} as const;

// ✅ Log de inicialização
if (config.debug) {
  console.log('🔧 [Config] Initialized with:');
  console.log('  - API Base URL:', config.apiBaseUrl);
  console.log('  - Use Mock Data:', config.useMockData);
  console.log('  - Endpoints:', Object.keys(API_ENDPOINTS).length, 'registered');
}