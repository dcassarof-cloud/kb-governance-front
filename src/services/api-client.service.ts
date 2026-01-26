// =====================================================
// API CLIENT SERVICE - Consisa KB Governance
// =====================================================

import { config } from '@/config/app-config';
import { authService } from './auth.service';
import { ApiError } from '@/types';

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

// ✅ FIX: Tipos do backend (formato diferente do frontend)
interface BackendPaginatedResponse<T> {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  items: T[];
}

// Tipo do frontend
interface FrontendPaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
}

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.apiBaseUrl;
    if (config.debug) {
      console.log('[ApiClient] Initialized with baseUrl:', this.baseUrl);
    }
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
        if (v !== undefined && v !== null && v !== "") usp.append(k, String(v));
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

  // ✅ FIX: Adapter para converter formato backend → frontend
  private adaptPaginatedResponse<T>(backendResponse: any): any {
    // Se não tem "items", não é paginado - retorna como está
    if (!backendResponse.items) {
      return backendResponse;
    }

    // Converte formato backend para frontend
    const adapted: FrontendPaginatedResponse<T> = {
      data: backendResponse.items,           // items → data
      total: backendResponse.totalElements,  // totalElements → total
      page: backendResponse.page,
      size: backendResponse.size,
      totalPages: backendResponse.totalPages,
    };

    if (config.debug) {
      console.log('[ApiClient] Adapted paginated response:', {
        original: { items: backendResponse.items?.length, totalElements: backendResponse.totalElements },
        adapted: { data: adapted.data?.length, total: adapted.total }
      });
    }

    return adapted;
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

    const json = JSON.parse(text);

    // ✅ FIX: Adapta resposta paginada se necessário
    return this.adaptPaginatedResponse<T>(json);
  }

  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    const url = this.buildUrl(endpoint, options?.params);

    if (config.debug) {
      console.log('[ApiClient] GET', url);
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(options?.headers),
      signal: options?.signal,
    });

    return this.handleResponse<T>(response);
  }

  async post<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    const url = this.buildUrl(endpoint, options?.params);

    if (config.debug) {
      console.log('[ApiClient] POST', url, body);
    }

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

    if (config.debug) {
      console.log('[ApiClient] PUT', url, body);
    }

    const response = await fetch(url, {
      method: 'PUT',
      headers: this.getHeaders(options?.headers),
      body: body ? JSON.stringify(body) : undefined,
      signal: options?.signal,
    });

    return this.handleResponse<T>(response);
  }

  async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    const url = this.buildUrl(endpoint, options?.params);

    if (config.debug) {
      console.log('[ApiClient] DELETE', url);
    }

    const response = await fetch(url, {
      method: 'DELETE',
      headers: this.getHeaders(options?.headers),
      signal: options?.signal,
    });

    return this.handleResponse<T>(response);
  }
}

export const apiClient = new ApiClient();