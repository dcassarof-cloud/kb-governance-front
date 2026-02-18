import { toApiError } from '@/lib/handle-api-error';

export interface ApiErrorInfo {
  message: string;
  status?: number;
  correlationId?: string;
  requestId?: string;
}

export const toApiErrorInfo = (error: unknown, fallbackMessage: string): ApiErrorInfo => {
  const apiError = toApiError(error);

  return {
    message: apiError.message || fallbackMessage,
    status: apiError.status,
    correlationId: apiError.correlationId,
    requestId: apiError.requestId,
  };
};

export const formatApiErrorInfo = (info: ApiErrorInfo) => {
  const details = [info.message];
  if (typeof info.status === 'number') {
    details.push(`Status: ${info.status}`);
  }
  if (info.correlationId) {
    details.push(`CorrelationId: ${info.correlationId}`);
  }
  if (info.requestId) {
    details.push(`RequestId: ${info.requestId}`);
  }
  return details.join(' • ');
};
