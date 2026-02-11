import { API_BASE_URL, API_ENDPOINTS } from './api';
import { authService } from '@/services/auth.service';

export interface HttpRequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  params?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
  data?: unknown;
  signal?: AbortSignal;
  skipAuthRefresh?: boolean;
}

export interface HttpResponse<T> {
  data: T;
  status: number;
  headers: Headers;
}

interface HttpErrorPayload {
  status?: number;
  message?: string;
  errorCode?: string;
  code?: string;
  correlationId?: string;
  timestamp?: string;
  details?: string[];
}

export class HttpError extends Error {
  response?: { status: number; data: HttpErrorPayload; headers: Headers };
  config: HttpRequestConfig;

  constructor(
    message: string,
    config: HttpRequestConfig,
    response?: { status: number; data: HttpErrorPayload; headers: Headers }
  ) {
    super(message);
    this.name = 'HttpError';
    this.config = config;
    this.response = response;
  }
}

let refreshPromise: Promise<boolean> | null = null;

let didLogApiBaseUrl = false;
if (import.meta.env.DEV && !didLogApiBaseUrl) {
  didLogApiBaseUrl = true;
  console.info('[api] Base URL em uso:', API_BASE_URL);
}

const createCorrelationId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
};

const isAuthEndpoint = (url: string) =>
  [API_ENDPOINTS.LOGIN, API_ENDPOINTS.REFRESH, API_ENDPOINTS.LOGOUT].some((path) => url.includes(path));

const buildUrl = (url: string, params?: HttpRequestConfig['params']) => {
  const path = url.startsWith('/') ? url : `/${url}`;
  const full = new URL(`${API_BASE_URL}${path}`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        full.searchParams.set(key, String(value));
      }
    });
  }

  return full.toString();
};

const parseJson = async <T>(response: Response): Promise<T> => {
  const text = await response.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
};

class HttpClient {
  async request<T>(config: HttpRequestConfig): Promise<HttpResponse<T>> {
    const method = config.method ?? 'GET';
    const token = authService.getAccessToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Correlation-Id': createCorrelationId(),
      ...config.headers,
    };

    if (token && !headers.Authorization) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(buildUrl(config.url, config.params), {
      method,
      headers,
      body: config.data === undefined ? undefined : JSON.stringify(config.data),
      signal: config.signal,
    });

    if (response.status === 401 && !config.skipAuthRefresh && !isAuthEndpoint(config.url)) {
      if (!refreshPromise) {
        refreshPromise = authService.refreshTokens().finally(() => {
          refreshPromise = null;
        });
      }

      const refreshed = await refreshPromise;
      if (refreshed) {
        return this.request<T>({ ...config, skipAuthRefresh: true });
      }

      await authService.logout();
      window.location.href = '/login';
    }

    if (!response.ok) {
      const payload: HttpErrorPayload = await parseJson<HttpErrorPayload>(response).catch(() => ({} as HttpErrorPayload));
      throw new HttpError(payload.message || `HTTP ${response.status}`, config, {
        status: response.status,
        data: payload,
        headers: response.headers,
      });
    }

    const data = await parseJson<T>(response);
    return { data, status: response.status, headers: response.headers };
  }

  post<T>(url: string, data?: unknown, config?: Omit<HttpRequestConfig, 'url' | 'method' | 'data'>) {
    return this.request<T>({ ...config, method: 'POST', url, data });
  }
}

export const apiClient = new HttpClient();
export const authClient = new HttpClient();
