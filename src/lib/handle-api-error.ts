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

    return {
      status: payload?.status ?? error.response?.status,
      code: payload?.errorCode ?? payload?.code ?? 'HTTP_ERROR',
      message: payload?.message ?? error.message,
      correlationId: payload?.correlationId,
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
