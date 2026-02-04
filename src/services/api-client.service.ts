// =====================================================
// API CLIENT SERVICE - Consisa KB Governance
// =====================================================

import { config } from '@/config/app-config';
import { authService } from './auth.service';
import { ApiError, PaginatedResponse } from '@/types';
import { normalizePaginatedResponse } from '@/lib/api-normalizers';

// Gera UUID v4 para correlation-id
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

interface RequestOptions {
  params?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

interface InternalRequestOptions extends RequestOptions {
  skipAuthRefresh?: boolean;
}

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.apiBaseUrl;
  }

  private buildUrl(
    endpoint: string,
    params?: Record<string, string | number | boolean | undefined>
  ): string {
    const base = (this.baseUrl || "").trim().replace(/\/+$/, ""); // tira barra final
    const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

    // concat manual segura (evita quirks do new URL quando base tem path)
    let full = `${base}${path}`;

    if (params) {
      const usp = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) usp.append(k, String(v));
      });

      const qs = usp.toString();
      if (qs) full += `?${qs}`;
    }

    return full;
  }

  private getHeaders(customHeaders?: Record<string, string>): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Correlation-Id': generateCorrelationId(),
      ...customHeaders,
    };

    // Auth Interceptor - Adiciona Bearer Token se existir
    const token = authService.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        code: 'UNKNOWN_ERROR',
        message: `HTTP Error: ${response.status} ${response.statusText}`,
      }));
      throw error;
    }

    // Handle empty responses
    const text = await response.text();
    if (!text) {
      return {} as T;
    }

    return JSON.parse(text);
  }

  private shouldAttemptRefresh(endpoint: string): boolean {
    return !endpoint.startsWith('/auth/login') && !endpoint.startsWith('/auth/refresh') && !endpoint.startsWith('/auth/logout');
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    endpoint: string,
    body?: unknown,
    options?: InternalRequestOptions
  ): Promise<T> {
    const url = this.buildUrl(endpoint, options?.params);

    const response = await fetch(url, {
      method,
      headers: this.getHeaders(options?.headers),
      body: body ? JSON.stringify(body) : undefined,
      signal: options?.signal,
    });

    if (response.status === 401 && !options?.skipAuthRefresh && this.shouldAttemptRefresh(endpoint)) {
      const refreshed = await authService.refreshTokens();
      if (refreshed) {
        return this.request<T>(method, endpoint, body, { ...options, skipAuthRefresh: true });
      }
      authService.clearToken();
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }

    return this.handleResponse<T>(response);
  }

  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('GET', endpoint, undefined, options);
  }

  /**
   * GET paginado com normalização única de payload.
   * Sempre retorna o formato interno do frontend.
   */
  async getPaginated<T>(
    endpoint: string,
    options?: RequestOptions & { page?: number; size?: number }
  ): Promise<PaginatedResponse<T>> {
    const fallbackPage =
      options?.page ??
      (typeof options?.params?.page === 'number' ? (options?.params?.page as number) : 1);
    const fallbackSize =
      options?.size ??
      (typeof options?.params?.size === 'number' ? (options?.params?.size as number) : config.defaultPageSize);

    const response = await this.get<unknown>(endpoint, options);
    return normalizePaginatedResponse<T>(response, fallbackPage, fallbackSize);
  }

  async post<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>('POST', endpoint, body, options);
  }

  async put<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>('PUT', endpoint, body, options);
  }

  async patch<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>('PATCH', endpoint, body, options);
  }

  async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('DELETE', endpoint, undefined, options);
  }
}

export const apiClient = new ApiClient();
