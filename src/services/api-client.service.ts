// =====================================================
// API CLIENT SERVICE - Consisa KB Governance
// =====================================================

import { config } from '@/config/app-config';
import { authService } from './auth.service';
import { ApiError, PaginatedResponse } from '@/types';
import { normalizePaginatedResponse } from '@/lib/api-normalizers';

// Gera UUID v4 para correlation-id
function generateCorrelationId(): string {
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
      'x-correlation-id': generateCorrelationId(),
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
    if (response.status === 401) {
      // Token inválido ou expirado - redireciona para login
      authService.clearToken();
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }

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

  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    const url = this.buildUrl(endpoint, options?.params);

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(options?.headers),
      signal: options?.signal,
    });

    return this.handleResponse<T>(response);
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
    const url = this.buildUrl(endpoint, options?.params);

    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(options?.headers),
      body: body ? JSON.stringify(body) : undefined,
      signal: options?.signal,
    });

    return this.handleResponse<T>(response);
  }

  async put<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    const url = this.buildUrl(endpoint, options?.params);

    const response = await fetch(url, {
      method: 'PUT',
      headers: this.getHeaders(options?.headers),
      body: body ? JSON.stringify(body) : undefined,
      signal: options?.signal,
    });

    return this.handleResponse<T>(response);
  }

  async patch<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    const url = this.buildUrl(endpoint, options?.params);

    const response = await fetch(url, {
      method: 'PATCH',
      headers: this.getHeaders(options?.headers),
      body: body ? JSON.stringify(body) : undefined,
      signal: options?.signal,
    });

    return this.handleResponse<T>(response);
  }

  async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    const url = this.buildUrl(endpoint, options?.params);

    const response = await fetch(url, {
      method: 'DELETE',
      headers: this.getHeaders(options?.headers),
      signal: options?.signal,
    });

    return this.handleResponse<T>(response);
  }
}

export const apiClient = new ApiClient();
