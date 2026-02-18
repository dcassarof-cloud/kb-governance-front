import { apiClient } from '@/config/axios';
import { config } from '@/config/app-config';
import { normalizePaginatedResponse } from '@/lib/api-normalizers';
import { handleApiError, toApiError } from '@/lib/handle-api-error';
import { ApiError, PaginatedResponse } from '@/types';

export interface RequestOptions {
  params?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export interface ApiResponseWithMeta<T> {
  data: T;
  headers: Headers;
  status: number;
}

/**
 * Cliente HTTP tipado usado pelos services de domínio.
 *
 * Contrato:
 * - centraliza chamadas GET/POST/PUT/PATCH/DELETE;
 * - normaliza erros via `handleApiError`;
 * - expõe métodos com e sem metadados de response;
 * - normaliza respostas paginadas heterogêneas do backend.
 */
class ApiClient {
  /**
   * Executa uma chamada HTTP e devolve payload + metadados da resposta.
   *
   * @throws ApiError normalizado com status/code/correlationId quando disponível.
   */
  private async requestWithMeta<T>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    endpoint: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<ApiResponseWithMeta<T>> {
    try {
      const response = await apiClient.request<T>({
        method,
        url: endpoint,
        data: body,
        params: options?.params,
        headers: options?.headers,
        signal: options?.signal,
      });

      return {
        data: response.data,
        headers: new Headers(response.headers as unknown as Record<string, string>),
        status: response.status,
      };
    } catch (error) {
      const normalizedError = handleApiError(error);

      if (config.debug) {
        console.error('[api] Requisição falhou', {
          endpoint,
          method,
          status: normalizedError.status,
          correlationId: normalizedError.correlationId,
          code: normalizedError.code,
        });
      }

      throw normalizedError;
    }
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    endpoint: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    const response = await this.requestWithMeta<T>(method, endpoint, body, options);
    return response.data;
  }

  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('GET', endpoint, undefined, options);
  }

  async getWithMeta<T>(endpoint: string, options?: RequestOptions): Promise<ApiResponseWithMeta<T>> {
    return this.requestWithMeta<T>('GET', endpoint, undefined, options);
  }

  /**
   * Busca lista paginada aceitando formatos de paginação diferentes.
   *
   * Usa `page` e `size` de fallback para manter consistência de paginação
   * na UI mesmo quando o backend retorna envelope parcial.
   */
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

  async postWithMeta<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<ApiResponseWithMeta<T>> {
    return this.requestWithMeta<T>('POST', endpoint, body, options);
  }

  async put<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>('PUT', endpoint, body, options);
  }

  async putWithMeta<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<ApiResponseWithMeta<T>> {
    return this.requestWithMeta<T>('PUT', endpoint, body, options);
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
export type { ApiError };
export { toApiError };


export async function runSupportImport() {
  return apiClientService.postWithMeta<unknown>('/support/import/run');
}

export async function getNeedsDebugCounts() {
  return apiClientService.getWithMeta<unknown>('/needs/debug-counts');
}

export async function getNeedsMetricsByTeam() {
  return apiClientService.getWithMeta<unknown>('/needs/metrics/by-team');
}
