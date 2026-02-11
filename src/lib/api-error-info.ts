import { HttpError } from '@/config/axios';
import { ApiError } from '@/types';

export interface ApiErrorInfo {
  message: string;
  status?: number;
  correlationId?: string;
}

const readHeader = (headers: Headers | undefined, key: string): string | null => {
  if (!headers) return null;
  return headers.get(key) ?? headers.get(key.toLowerCase()) ?? headers.get(key.toUpperCase());
};

export const toApiErrorInfo = (error: unknown, fallbackMessage: string): ApiErrorInfo => {
  if (error instanceof HttpError) {
    const payload = error.response?.data;
    const correlationId =
      readHeader(error.response?.headers, 'x-correlation-id') ??
      readHeader(error.response?.headers, 'x-request-id') ??
      payload?.correlationId;

    return {
      message: payload?.message ?? error.message ?? fallbackMessage,
      status: error.response?.status,
      correlationId: correlationId ?? undefined,
    };
  }

  if (error && typeof error === 'object') {
    const apiError = error as ApiError;
    return {
      message: apiError.message ?? fallbackMessage,
      status: apiError.status,
      correlationId: apiError.correlationId,
    };
  }

  if (error instanceof Error) {
    return { message: error.message || fallbackMessage };
  }

  return { message: fallbackMessage };
};

export const formatApiErrorInfo = (info: ApiErrorInfo) => {
  const details = [info.message];
  if (typeof info.status === 'number') {
    details.push(`Status: ${info.status}`);
  }
  if (info.correlationId) {
    details.push(`CorrelationId: ${info.correlationId}`);
  }
  return details.join(' • ');
};
