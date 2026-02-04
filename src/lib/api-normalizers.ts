// =====================================================
// API NORMALIZERS - Consisa KB Governance
// =====================================================

import { PaginatedResponse } from '@/types';

type PaginatedShape = Record<string, unknown>;

const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const logNormalizationIssue = (message: string, payload: unknown) => {
  if (import.meta.env.DEV) {
    // Não silencie normalizações falhas em DEV.
    console.error(`[api-normalizers] ${message}`, payload);
  }
};

/**
 * Normaliza respostas paginadas vindas do backend para o formato único do frontend.
 * Formato interno:
 * {
 *   data: [],
 *   page: number,
 *   size: number,
 *   total: number,
 *   totalPages: number
 * }
 */
export function normalizePaginatedResponse<T>(
  response: unknown,
  fallbackPage: number,
  fallbackSize: number
): PaginatedResponse<T> {
  if (Array.isArray(response)) {
    return {
      data: response as T[],
      total: response.length,
      page: fallbackPage,
      size: fallbackSize,
      totalPages: Math.ceil(response.length / fallbackSize) || 1,
    };
  }

  if (response && typeof response === 'object') {
    const obj = response as PaginatedShape;
    const items = (obj.data ?? obj.items ?? obj.content ?? obj.results ?? obj.records ?? obj.rows ?? []) as unknown;
    const data = Array.isArray(items) ? (items as T[]) : [];

    if (!Array.isArray(items)) {
      logNormalizationIssue('Resposta paginada sem lista detectável.', response);
    }

    const page =
      (isNumber(obj.page) ? obj.page : null) ??
      (isNumber(obj.pageNumber) ? obj.pageNumber : null) ??
      fallbackPage;
    const size =
      (isNumber(obj.size) ? obj.size : null) ??
      (isNumber(obj.pageSize) ? obj.pageSize : null) ??
      fallbackSize;
    const total =
      (isNumber(obj.total) ? obj.total : null) ??
      (isNumber(obj.totalElements) ? obj.totalElements : null) ??
      (isNumber(obj.totalItems) ? obj.totalItems : null) ??
      data.length;
    const totalPages =
      (isNumber(obj.totalPages) ? obj.totalPages : null) ??
      (isNumber(obj.pages) ? obj.pages : null) ??
      (size > 0 ? Math.ceil(total / size) : 1);

    return {
      data,
      total,
      page,
      size,
      totalPages,
    };
  }

  logNormalizationIssue('Resposta paginada inválida.', response);

  return {
    data: [],
    total: 0,
    page: fallbackPage,
    size: fallbackSize,
    totalPages: 0,
  };
}
