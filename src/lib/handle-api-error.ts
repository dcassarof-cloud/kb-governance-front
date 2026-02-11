import { HttpError } from '@/config/axios';
import { ApiError } from '@/types';

const DEFAULT_API_ERROR: ApiError = {
  code: 'UNKNOWN_ERROR',
  message: 'Erro inesperado na comunicação com o servidor.',
  details: [],
};

export function handleApiError(error: unknown): ApiError {
  if (error instanceof HttpError) {
    const payload = error.response?.data;
    const correlationHeader = error.response?.headers.get('X-Correlation-Id') ?? error.response?.headers.get('X-Request-Id');

    return {
      status: payload?.status ?? error.response?.status,
      code: payload?.errorCode ?? payload?.code ?? 'HTTP_ERROR',
      message: payload?.message ?? error.message,
      correlationId: payload?.correlationId ?? correlationHeader ?? undefined,
      timestamp: payload?.timestamp,
      details: payload?.details ?? [],
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
