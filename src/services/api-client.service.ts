// =====================================================
// API CLIENT SERVICE - Consisa KB Governance
// =====================================================

import { config } from '@/config/app-config';
import { ApiError, PaginatedResponse } from '@/types';
import { normalizePaginatedResponse } from '@/lib/api-normalizers';
import { httpRequest, type RequestOptions } from './http';

class ApiClient {
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        code: 'UNKNOWN_ERROR',
        message: `HTTP Error: ${response.status} ${response.statusText}`,
      }));
      throw error;
    }

    const text = await response.text();
    if (!text) {
      return {} as T;
    }

    return JSON.parse(text) as T;
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    endpoint: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    const response = await httpRequest(method, endpoint, body, options);
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
      (typeof options?.params?.size === 'number'
        ? (options?.params?.size as number)
        : config.defaultPageSize);

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
