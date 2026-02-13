import { API_BASE_URL, API_ENDPOINT, API_ENDPOINTS } from './api';

export { API_BASE_URL, API_ENDPOINT, API_ENDPOINTS };

export const config = {
  apiBaseUrl: API_BASE_URL,
  useMockData: false,
  appName: 'Consisa Organisa',
  appVersion: '1.0.0',
  tokenKey: 'kb_governance_token',
  refreshTokenKey: 'kb_governance_refresh_token',
  userKey: 'kb_governance_user',
  defaultPageSize: 10,
  pageSizeOptions: [10, 25, 50, 100],
  debug: import.meta.env.DEV,
  governanceDueDateFormat: (import.meta.env.VITE_GOVERNANCE_DUE_DATE_FORMAT || 'offset-datetime') as
    | 'local-date'
    | 'offset-datetime',
} as const;
