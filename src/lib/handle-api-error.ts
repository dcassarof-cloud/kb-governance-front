import { HttpError } from '@/config/axios';
import { ApiError } from '@/types';

const DEFAULT_API_ERROR: ApiError = {
  code: 'UNKNOWN_ERROR',
  message: 'Erro inesperado na comunicação com o servidor.',
  details: [],
};

const readHeader = (headers: Headers | undefined, key: string): string | null => {
  if (!headers) return null;
  return headers.get(key) ?? headers.get(key.toLowerCase()) ?? headers.get(key.toUpperCase());
};

/**
 * Converte qualquer erro em um contrato único para UI e hooks.
 *
 * Prioridade de mensagem:
 * 1) body.message
 * 2) body.error
 * 3) statusText / message padrão da exceção HTTP
 */
export function toApiError(error: unknown): ApiError {
  if (error instanceof HttpError) {
    const payload = (error.response?.data ?? {}) as Record<string, unknown>;
    const correlationId =
      readHeader(error.response?.headers, 'X-Correlation-Id') ??
      readHeader(error.response?.headers, 'X-Correlation-Id'.toLowerCase()) ??
      (typeof payload.correlationId === 'string' ? payload.correlationId : undefined);

    const requestId =
      readHeader(error.response?.headers, 'X-Request-Id') ??
      readHeader(error.response?.headers, 'X-Request-Id'.toLowerCase()) ??
      (typeof payload.requestId === 'string' ? payload.requestId : undefined);

    const message =
      (typeof payload.message === 'string' && payload.message.trim()) ||
      (typeof payload.error === 'string' && payload.error.trim()) ||
      error.message ||
      `HTTP ${error.response?.status ?? 'erro'}`;

    return {
      status: (typeof payload.status === 'number' ? payload.status : undefined) ?? error.response?.status,
      code:
        (typeof payload.code === 'string' ? payload.code : undefined) ??
        (typeof payload.errorCode === 'string' ? payload.errorCode : undefined) ??
        'HTTP_ERROR',
      message,
      correlationId: correlationId ?? undefined,
      requestId: requestId ?? undefined,
      timestamp: typeof payload.timestamp === 'string' ? payload.timestamp : undefined,
      details: payload.details,
    };
  }

  if (error instanceof Error) {
    return {
      ...DEFAULT_API_ERROR,
      message: error.message,
    };
  }

  return DEFAULT_API_ERROR;
}

export function handleApiError(error: unknown): ApiError {
  return toApiError(error);
}
