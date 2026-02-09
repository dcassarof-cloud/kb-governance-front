// =====================================================
// HTTP CLIENT - Consisa KB Governance
// =====================================================

import { API_ENDPOINTS, config } from '@/config/app-config';
import { authService } from './auth.service';

export interface RequestOptions {
  params?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  skipAuthRefresh?: boolean;
}

let refreshPromise: Promise<boolean> | null = null;

function generateCorrelationId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function buildUrl(
  endpoint: string,
  params?: Record<string, string | number | boolean | undefined>
): string {
  const base = (config.apiBaseUrl || '').trim().replace(/\/+$/, '');
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  let full = `${base}${path}`;

  if (params) {
    const usp = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) usp.append(key, String(value));
    });
    const qs = usp.toString();
    if (qs) full += `?${qs}`;
  }

  return full;
}

function getHeaders(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  hasBody: boolean,
  customHeaders?: Record<string, string>
): HeadersInit {
  const headers: Record<string, string> = {
    ...customHeaders,
  };

  const token = authService.getAccessToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (hasBody) {
    headers['Content-Type'] = 'application/json';
  }

  const hasAuthorization = Boolean(token || customHeaders?.Authorization);
  if (hasAuthorization || hasBody || method !== 'GET') {
    headers['X-Correlation-Id'] = generateCorrelationId();
  }

  return headers;
}

function isAuthEndpoint(endpoint: string): boolean {
  const normalized = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return [API_ENDPOINTS.LOGIN, API_ENDPOINTS.REFRESH, API_ENDPOINTS.LOGOUT].some((authPath) =>
    normalized.startsWith(authPath)
  );
}

export async function httpRequest(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  endpoint: string,
  body?: unknown,
  options?: RequestOptions
): Promise<Response> {
  const url = buildUrl(endpoint, options?.params);
  const hasBody = body !== undefined;

  const response = await fetch(url, {
    method,
    headers: getHeaders(method, hasBody, options?.headers),
    body: hasBody ? JSON.stringify(body) : undefined,
    signal: options?.signal,
  });

  if (response.status === 401 && !options?.skipAuthRefresh && !isAuthEndpoint(endpoint)) {
    if (!refreshPromise) {
      refreshPromise = (async () => {
        try {
          return await authService.refreshTokens();
        } finally {
          refreshPromise = null;
        }
      })();
    }
    const refreshed = await refreshPromise;

    if (refreshed) {
      return httpRequest(method, endpoint, body, { ...options, skipAuthRefresh: true });
    }

    authService.clearToken();
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  return response;
}
