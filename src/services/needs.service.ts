// =====================================================
// NEEDS SERVICE - Consisa KB Governance
// =====================================================

import { API_ENDPOINTS, config } from '@/config/app-config';
import { normalizePaginatedResponse } from '@/lib/api-normalizers';
import { apiClient } from './api-client.service';
import { authService } from './auth.service';
import { IssueSeverity, NeedDetail, NeedItem, NeedTicketExample, PaginatedResponse } from '@/types';
import {
  NeedHistoryItemResponse,
  NeedMetricsSummaryResponse,
  NeedStatusActionRequest,
  NeedTriageRequest,
} from '@/types/needs-enterprise';

export interface NeedsRequestMeta {
  partialFailure: boolean;
  requestId?: string;
  correlationId?: string;
}

export interface NeedsListResult {
  payload: PaginatedResponse<NeedItem>;
  meta: NeedsRequestMeta;
}

export interface NeedsFilter {
  systemCode?: string;
  status?: string;
  start?: string;
  end?: string;
  page?: number;
  size?: number;
  periodStart?: string;
  periodEnd?: string;
  sort?: string;
}

const toNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const toNeedSeverity = (value: unknown): IssueSeverity | NeedTriageRequest['severity'] | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.toUpperCase();
  if (['INFO', 'WARN', 'ERROR', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(normalized)) {
    return normalized as IssueSeverity | NeedTriageRequest['severity'];
  }
  return null;
};

const formatDateInput = (value?: string) => {
  if (!value) return undefined;
  return value.split('T')[0];
};

const normalizeNeedExample = (raw: unknown): NeedTicketExample | null => {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;

  return {
    id: obj.id ? String(obj.id) : (obj.ticketId as string) ?? (obj.code as string) ?? null,
    title:
      (obj.title as string) ??
      (obj.subject as string) ??
      (obj.summary as string) ??
      (obj.name as string) ??
      null,
    systemCode: (obj.systemCode as string) ?? (obj.system as string) ?? (obj.systemId as string) ?? null,
    url: (obj.url as string) ?? (obj.link as string) ?? (obj.ticketUrl as string) ?? null,
    createdAt: (obj.createdAt as string) ?? (obj.created_at as string) ?? (obj.openedAt as string) ?? null,
  };
};

const normalizeNeed = (raw: unknown): NeedItem => {
  if (!raw || typeof raw !== 'object') {
    return { id: '' };
  }

  const obj = raw as Record<string, unknown>;
  const windowObj = (obj.window as Record<string, unknown>) ?? null;

  return {
    id: obj.id ? String(obj.id) : (obj.needId as string) ?? (obj.code as string) ?? '',
    protocol: (obj.protocol as string) ?? (obj.ticketId as string) ?? (obj.movideskId as string) ?? null,
    subject: (obj.subject as string) ?? (obj.title as string) ?? null,
    summary: (obj.summary as string) ?? (obj.subject as string) ?? (obj.title as string) ?? null,
    systemCode: (obj.systemCode as string) ?? (obj.system as string) ?? (obj.systemId as string) ?? null,
    systemName: (obj.systemName as string) ?? (obj.systemLabel as string) ?? null,
    status: (obj.status as string) ?? (obj.state as string) ?? null,
    severity: toNeedSeverity(obj.severity ?? obj.priority),
    source: (obj.source as NeedItem['source']) ?? null,
    dueAt: (obj.dueAt as string) ?? (obj.dueDate as string) ?? null,
    priorityScore: toNumber(obj.priorityScore),
    occurrences: toNumber(obj.occurrences ?? obj.recurrence ?? obj.recurringCount ?? obj.quantity ?? obj.count ?? obj.total),
    lastOccurrenceAt:
      (obj.lastOccurrenceAt as string) ??
      (obj.lastOccurrence as string) ??
      (obj.last_seen_at as string) ??
      (obj.updatedAt as string) ??
      (obj.updated_at as string) ??
      null,
    windowStart:
      (obj.windowStart as string) ??
      (windowObj?.start as string) ??
      (obj.startDate as string) ??
      null,
    windowEnd:
      (obj.windowEnd as string) ??
      (windowObj?.end as string) ??
      (obj.endDate as string) ??
      null,
    link:
      (obj.link as string) ??
      (obj.url as string) ??
      (obj.ticketUrl as string) ??
      null,
    ticketUrl:
      (obj.ticketUrl as string) ??
      (obj.link as string) ??
      (obj.url as string) ??
      null,
    reason:
      (obj.reason as string) ??
      (obj.generatedReason as string) ??
      (obj.cause as string) ??
      (obj.description as string) ??
      null,
    quantity: toNumber(obj.quantity ?? obj.count ?? obj.total) ?? null,
    createdAt: (obj.createdAt as string) ?? (obj.created_at as string) ?? null,
    updatedAt: (obj.updatedAt as string) ?? (obj.updated_at as string) ?? null,
    sourceType: (() => {
      const rawType = ((obj.sourceType as string) ?? (obj.origin as string) ?? '').toUpperCase();
      if (rawType.includes('DETECTED')) return 'DETECTED';
      if (obj.detectedNeedId || obj.needRecordId) return 'DETECTED';
      return 'RECURRING';
    })(),
    canCreateMasterTicket: (() => {
      if (typeof obj.canCreateMasterTicket === 'boolean') return obj.canCreateMasterTicket;
      const rawType = ((obj.sourceType as string) ?? (obj.origin as string) ?? '').toUpperCase();
      if (rawType.includes('DETECTED')) return true;
      if (obj.detectedNeedId || obj.needRecordId) return true;
      return false;
    })(),

  };
};

const normalizeNeedDetail = (raw: unknown): NeedDetail => {
  const base = normalizeNeed(raw);
  if (!raw || typeof raw !== 'object') {
    return base;
  }

  const obj = raw as Record<string, unknown>;
  const examplesRaw = obj.examples ?? obj.sampleTickets ?? obj.tickets ?? obj.items ?? obj.content ?? [];
  const examples = Array.isArray(examplesRaw)
    ? examplesRaw.map((item) => normalizeNeedExample(item)).filter((item): item is NeedTicketExample => Boolean(item))
    : [];

  return {
    ...base,
    description:
      (obj.description as string) ?? (obj.details as string) ?? (obj.reason as string) ?? base.reason ?? null,
    examples,
  };
};

class NeedsService {
  async listNeeds(filter: NeedsFilter = {}): Promise<PaginatedResponse<NeedItem>> {
    const { systemCode, status, start, end, periodStart, periodEnd, sort, page = 1, size = config.defaultPageSize } = filter;

    const response = await apiClient.get<unknown>(API_ENDPOINTS.NEEDS, {
      params: {
        systemCode,
        status,
        start: formatDateInput(start ?? periodStart),
        end: formatDateInput(end ?? periodEnd),
        sort,
        page,
        size,
      },
    });

    const payload = normalizePaginatedResponse<unknown>(response, page, size);

    return {
      ...payload,
      data: payload.data.map((item) => normalizeNeed(item)),
    };
  }

  async listNeedsWithMeta(filter: NeedsFilter = {}): Promise<NeedsListResult> {
    const { systemCode, status, start, end, periodStart, periodEnd, sort, page = 1, size = config.defaultPageSize } = filter;

    const response = await apiClient.getWithMeta<unknown>(API_ENDPOINTS.NEEDS, {
      params: {
        systemCode,
        status,
        start: formatDateInput(start ?? periodStart),
        end: formatDateInput(end ?? periodEnd),
        sort,
        page,
        size,
      },
    });

    const payload = normalizePaginatedResponse<unknown>(response.data, page, size);

    return {
      payload: {
        ...payload,
        data: payload.data.map((item) => normalizeNeed(item)),
      },
      meta: {
        partialFailure: (response.headers.get('X-Partial-Failure') ?? '').toLowerCase() === 'movidesk_unavailable',
        requestId: response.headers.get('X-Request-Id') ?? undefined,
        correlationId: response.headers.get('X-Correlation-Id') ?? undefined,
      },
    };
  }

  async getNeed(id: string): Promise<NeedDetail> {
    const response = await apiClient.get<unknown>(API_ENDPOINTS.NEEDS_BY_ID(id));
    return normalizeNeedDetail(response);
  }

  async getNeedMetricsSummary(): Promise<NeedMetricsSummaryResponse> {
    return apiClient.get<NeedMetricsSummaryResponse>(API_ENDPOINTS.NEEDS_METRICS_SUMMARY);
  }

  async getNeedHistory(needId: number): Promise<NeedHistoryItemResponse[]> {
    return apiClient.get<NeedHistoryItemResponse[]>(API_ENDPOINTS.NEEDS_HISTORY(needId));
  }

  async triageNeed(needId: number, body: NeedTriageRequest): Promise<void> {
    await apiClient.post(API_ENDPOINTS.NEEDS_TRIAGE(needId), body);
  }

  async startNeed(needId: number, body: NeedStatusActionRequest): Promise<void> {
    await apiClient.post(API_ENDPOINTS.NEEDS_START(needId), body);
  }

  async blockNeed(needId: number, body: NeedStatusActionRequest): Promise<void> {
    await apiClient.post(API_ENDPOINTS.NEEDS_BLOCK(needId), body);
  }

  async completeNeed(needId: number, body: NeedStatusActionRequest): Promise<void> {
    await apiClient.post(API_ENDPOINTS.NEEDS_COMPLETE(needId), body);
  }

  async cancelNeed(needId: number, body: NeedStatusActionRequest): Promise<void> {
    await apiClient.post(API_ENDPOINTS.NEEDS_CANCEL(needId), body);
  }

  async createInternalTask(id: string): Promise<void> {
    const actor = authService.getActorIdentifier() ?? 'system';
    await apiClient.post(API_ENDPOINTS.NEEDS_CREATE_TASK(id), { actor });
  }

  async createMasterTicket(id: string): Promise<void> {
    const actor = authService.getActorIdentifier() ?? 'system';
    await apiClient.post(API_ENDPOINTS.NEEDS_CREATE_MASTER_TICKET(id), { actor });
  }
}

export const needsService = new NeedsService();

export const getNeedMetricsSummary = () => needsService.getNeedMetricsSummary();
export const getNeedHistory = (needId: number) => needsService.getNeedHistory(needId);
export const triageNeed = (needId: number, body: NeedTriageRequest) => needsService.triageNeed(needId, body);
export const startNeed = (needId: number, body: NeedStatusActionRequest) => needsService.startNeed(needId, body);
export const blockNeed = (needId: number, body: NeedStatusActionRequest) => needsService.blockNeed(needId, body);
export const completeNeed = (needId: number, body: NeedStatusActionRequest) => needsService.completeNeed(needId, body);
export const cancelNeed = (needId: number, body: NeedStatusActionRequest) => needsService.cancelNeed(needId, body);
