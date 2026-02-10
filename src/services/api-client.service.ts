import { apiClient } from '@/config/axios';
import { config } from '@/config/app-config';
import { normalizePaginatedResponse } from '@/lib/api-normalizers';
import { handleApiError } from '@/lib/handle-api-error';
import { PaginatedResponse } from '@/types';

export interface RequestOptions {
  params?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

class ApiClient {
  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    endpoint: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    try {
      const response = await apiClient.request<T>({
        method,
        url: endpoint,
        data: body,
        params: options?.params,
        headers: options?.headers,
        signal: options?.signal,
      });

      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('GET', endpoint, undefined, options);
  }

  async getPaginated<T>(
    endpoint: string,
    options?: RequestOptions & { page?: number; size?: number }
  ): Promise<PaginatedResponse<T>> {
    const fallbackPage =
      options?.page ??
      (typeof options?.params?.page === 'number' ? (options.params.page as number) : 1);

    const fallbackSize =
      options?.size ??
      (typeof options?.params?.size === 'number'
        ? (options.params.size as number)
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

export const apiClientService = new ApiClient();
export const apiClientInstance = apiClientService;
export { apiClientService as apiClient };
