// =====================================================
// NEEDS SERVICE - Consisa KB Governance
// =====================================================

import { API_ENDPOINTS, config } from '@/config/app-config';
import { apiClient } from './api-client.service';
import { IssueSeverity, NeedDetail, NeedItem, NeedTicketExample, PaginatedResponse } from '@/types';

export interface NeedsFilter {
  page?: number;
  size?: number;
  systemCode?: string;
  status?: string;
  severity?: IssueSeverity | '';
  windowStart?: string;
  windowEnd?: string;
}

function normalizePaginatedResponse<T>(response: unknown, page: number, size: number): PaginatedResponse<T> {
  if (Array.isArray(response)) {
    return {
      data: response,
      total: response.length,
      page,
      size,
      totalPages: Math.ceil(response.length / size) || 1,
    };
  }

  if (response && typeof response === 'object') {
    const obj = response as Record<string, unknown>;
    const items = obj.data || obj.items || obj.content || [];
    const dataArray = Array.isArray(items) ? items : [];

    return {
      data: dataArray as T[],
      total: (obj.total as number) ?? (obj.totalElements as number) ?? (obj.totalItems as number) ?? dataArray.length,
      page: (obj.page as number) ?? (obj.pageNumber as number) ?? page,
      size: (obj.size as number) ?? (obj.pageSize as number) ?? size,
      totalPages: (obj.totalPages as number) ?? (obj.pages as number) ?? (Math.ceil(dataArray.length / size) || 1),
    };
  }

  return {
    data: [],
    total: 0,
    page,
    size,
    totalPages: 0,
  };
}

const toNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

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
    systemCode: (obj.systemCode as string) ?? (obj.system as string) ?? (obj.systemId as string) ?? null,
    systemName: (obj.systemName as string) ?? (obj.systemLabel as string) ?? null,
    status: (obj.status as string) ?? (obj.state as string) ?? null,
    severity: (obj.severity as IssueSeverity) ?? (obj.priority as IssueSeverity) ?? null,
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
    reason:
      (obj.reason as string) ??
      (obj.generatedReason as string) ??
      (obj.cause as string) ??
      (obj.description as string) ??
      null,
    quantity: toNumber(obj.quantity ?? obj.count ?? obj.total) ?? null,
    createdAt: (obj.createdAt as string) ?? (obj.created_at as string) ?? null,
    updatedAt: (obj.updatedAt as string) ?? (obj.updated_at as string) ?? null,
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
    const {
      page = 1,
      size = config.defaultPageSize,
      systemCode,
      status,
      severity,
      windowStart,
      windowEnd,
    } = filter;

    const response = await apiClient.get<unknown>(API_ENDPOINTS.NEEDS, {
      params: {
        page,
        size,
        systemCode,
        status,
        severity,
        windowStart,
        windowEnd,
      },
    });

    const normalized = normalizePaginatedResponse<NeedItem>(response, page, size);

    return {
      ...normalized,
      data: normalized.data.map((item) => normalizeNeed(item)),
    };
  }

  async getNeed(id: string): Promise<NeedDetail> {
    const response = await apiClient.get<unknown>(API_ENDPOINTS.NEEDS_BY_ID(id));
    return normalizeNeedDetail(response);
  }

  async createInternalTask(id: string): Promise<void> {
    await apiClient.post(API_ENDPOINTS.NEEDS_CREATE_TASK(id), {});
  }

  async createMasterTicket(id: string): Promise<void> {
    await apiClient.post(API_ENDPOINTS.NEEDS_CREATE_MASTER_TICKET(id), {});
  }
}

export const needsService = new NeedsService();
