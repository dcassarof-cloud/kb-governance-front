// =====================================================
// GOVERNANCE SERVICE - Consisa KB Governance
// =====================================================

import { config, API_ENDPOINTS } from '@/config/app-config';
import { apiClient } from './api-client.service';

import {
  GovernanceIssue,
  IssueType,
  IssueSeverity,
  IssueStatus,
  PaginatedResponse,
  GovernanceSummary,
  GovernanceManual,
  IssueHistoryEntry,
  GovernanceResponsible,
  GovernanceSuggestedAssignee,
  GovernanceResponsiblesSummary,
  DuplicateGroup,
  DuplicateArticle,
  GovernanceIssueDetail,
} from '@/types';

export interface IssuesFilter {
  page?: number;
  size?: number;
  type?: IssueType;
  severity?: IssueSeverity;
  status?: IssueStatus;
  systemCode?: string;
  responsible?: string;
  q?: string;
}

/**
 * ✅ Filtros alinhados com o endpoint atual do backend:
 * GET /api/v1/governance/manuals?page=1&size=10&system=&status=&q=
 */
export interface GovernanceManualFilters {
  page?: number;
  size?: number;
  system?: string;
  status?: string;
  q?: string;
}

/**
 * Helper: Normaliza resposta paginada (suporta items, content, data, ou array direto)
 */
function normalizePaginatedResponse<T>(response: unknown, page: number, size: number): PaginatedResponse<T> {
  // Se é um array direto
  if (Array.isArray(response)) {
    return {
      data: response,
      total: response.length,
      page,
      size,
      totalPages: Math.ceil(response.length / size) || 1,
    };
  }

  // Se é um objeto
  if (response && typeof response === 'object') {
    const obj = response as Record<string, unknown>;

    // Tenta extrair dados de diferentes formatos de API
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

  // Fallback: retorna estrutura vazia
  return {
    data: [],
    total: 0,
    page,
    size,
    totalPages: 0,
  };
}

/**
 * Helper: Normaliza resposta de array (suporta items, content, data, ou array direto)
 */
function normalizeArrayResponse<T>(response: unknown): T[] {
  if (Array.isArray(response)) return response;

  if (response && typeof response === 'object') {
    const obj = response as Record<string, unknown>;
    const items = obj.data || obj.items || obj.content || [];
    if (Array.isArray(items)) return items as T[];
  }

  return [];
}

const normalizeResponsible = (response: unknown): GovernanceResponsible | null => {
  if (!response || typeof response !== 'object') return null;
  const obj = response as Record<string, unknown>;
  const name =
    (obj.name as string) ||
    (obj.responsible as string) ||
    (obj.assignee as string) ||
    (obj.user as string) ||
    (obj.email as string) ||
    '';
  if (!name) return null;

  const toNumber = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : null);

  return {
    id: obj.id ? String(obj.id) : undefined,
    name,
    email: (obj.email as string) ?? (obj.userEmail as string) ?? null,
    pendingIssues: toNumber(obj.pendingIssues ?? obj.pending ?? obj.openIssues ?? obj.issuesOpen),
    openIssues: toNumber(obj.openIssues ?? obj.issuesOpen ?? obj.totalOpen),
    overdueIssues: toNumber(obj.overdueIssues ?? obj.overdue ?? obj.overdueTotal),
    avgSlaDays: toNumber(obj.avgSlaDays ?? obj.slaAvgDays ?? obj.avgSla ?? obj.slaDays),
  };
};

const normalizeResponsibleList = (response: unknown): GovernanceResponsible[] =>
  normalizeArrayResponse<unknown>(response)
    .map((item) => normalizeResponsible(item))
    .filter((item): item is GovernanceResponsible => Boolean(item));

const normalizeDuplicateArticle = (raw: unknown): DuplicateArticle | null => {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  return {
    id: obj.id ? String(obj.id) : (obj.articleId as string) ?? (obj.manualId as string) ?? '',
    title: (obj.title as string) ?? (obj.articleTitle as string) ?? (obj.name as string) ?? 'Sem título',
    systemCode: (obj.systemCode as string) ?? (obj.system as string) ?? (obj.systemId as string) ?? 'N/A',
    url: (obj.url as string) ?? (obj.link as string) ?? (obj.manualLink as string) ?? '',
    updatedAt:
      (obj.updatedAt as string) ??
      (obj.updated_at as string) ??
      (obj.lastUpdatedAt as string) ??
      (obj.lastUpdated as string) ??
      '',
  };
};

const normalizeDuplicateGroup = (raw: unknown): DuplicateGroup | null => {
  if (!raw) return null;
  if (Array.isArray(raw)) {
    const articles = raw
      .map((item) => normalizeDuplicateArticle(item))
      .filter((item): item is DuplicateArticle => Boolean(item && item.id));
    if (articles.length === 0) return null;
    return {
      hash: '',
      count: articles.length,
      articles,
    };
  }

  if (typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    const articlesRaw = obj.articles ?? obj.items ?? obj.content ?? obj.data ?? obj.duplicates ?? [];
    const articles = Array.isArray(articlesRaw)
      ? articlesRaw
          .map((item) => normalizeDuplicateArticle(item))
          .filter((item): item is DuplicateArticle => Boolean(item && item.id))
      : [];

    if (articles.length === 0) return null;

    return {
      hash: (obj.hash as string) ?? (obj.duplicateHash as string) ?? (obj.contentHash as string) ?? '',
      count: (obj.count as number) ?? articles.length,
      status: (obj.status as string) ?? undefined,
      articles,
    };
  }

  return null;
};

const normalizeIssueDetail = (response: unknown): GovernanceIssueDetail => {
  if (!response || typeof response !== 'object') {
    return {
      id: '',
      type: 'INCOMPLETE_CONTENT',
      severity: 'LOW',
      articleId: '',
      articleTitle: '',
      systemCode: '',
      status: 'OPEN',
      createdAt: '',
      details: '',
    };
  }

  const raw = response as Record<string, unknown>;
  const issueData = (raw.issue as Record<string, unknown>) ?? (raw.data as Record<string, unknown>) ?? raw;

  const duplicateGroup =
    normalizeDuplicateGroup(issueData?.duplicateGroup ?? issueData?.duplicates ?? issueData?.duplicateArticles ?? null) ??
    normalizeDuplicateGroup(raw?.duplicateGroup ?? raw?.duplicates ?? raw?.duplicateArticles ?? null);

  return {
    ...(issueData as GovernanceIssueDetail),
    duplicateGroup,
    duplicateHash:
      (issueData.duplicateHash as string) ??
      (issueData.contentHash as string) ??
      (raw.duplicateHash as string) ??
      (raw.contentHash as string) ??
      null,
  };
};

class GovernanceService {
  private formatDueDateForAssign(dueDate?: string): string | undefined {
    if (!dueDate) return undefined;
    if (config.governanceDueDateFormat === 'offset-datetime') {
      return dueDate.includes('T') ? dueDate : `${dueDate}T00:00:00-03:00`;
    }
    return dueDate.includes('T') ? dueDate.split('T')[0] : dueDate;
  }

  async getSummary(): Promise<GovernanceSummary> {
    const response = await apiClient.get<unknown>(API_ENDPOINTS.GOVERNANCE_SUMMARY);
    const data = response as Record<string, unknown> | null;

    return {
      totalIssues:
        (data?.totalIssues as number) ??
        (data?.issuesTotal as number) ??
        (data?.total as number) ??
        null,
      unassignedIssues:
        (data?.unassignedIssues as number) ??
        (data?.issuesUnassigned as number) ??
        (data?.withoutResponsible as number) ??
        null,
      openIssues: (data?.openIssues as number) ?? (data?.issuesOpen as number) ?? null,
      resolvedLast7Days:
        (data?.resolvedLast7Days as number) ??
        (data?.issuesResolved7d as number) ??
        (data?.resolvedLastWeek as number) ??
        null,
    };
  }

  /**
   * Lista manuais/artigos para a tela de governança.
   * Backend esperado: GET /api/v1/governance/manuals
   */
  async listManuals(filter: GovernanceManualFilters = {}): Promise<PaginatedResponse<GovernanceManual>> {
    const { page = 1, size = config.defaultPageSize, system, status, q } = filter;

    const response = await apiClient.get<unknown>(API_ENDPOINTS.GOVERNANCE_MANUALS, {
      params: { page, size, system, status, q },
    });

    return normalizePaginatedResponse<GovernanceManual>(response, page, size);
  }

  async assignManual(id: string, responsible: string): Promise<void> {
    await apiClient.post(API_ENDPOINTS.GOVERNANCE_MANUAL_ASSIGN(id), { responsible });
  }

  async reviewManual(id: string): Promise<void> {
    await apiClient.post(API_ENDPOINTS.GOVERNANCE_MANUAL_REVIEW(id));
  }

  async moveManual(id: string): Promise<void> {
    await apiClient.post(API_ENDPOINTS.GOVERNANCE_MANUAL_MOVE(id));
  }

  async mergeManual(id: string): Promise<void> {
    await apiClient.post(API_ENDPOINTS.GOVERNANCE_MANUAL_MERGE(id));
  }

  async resolveManual(id: string): Promise<void> {
    await apiClient.post(API_ENDPOINTS.GOVERNANCE_MANUAL_RESOLVE(id));
  }

  async ignoreManual(id: string): Promise<void> {
    await apiClient.post(API_ENDPOINTS.GOVERNANCE_MANUAL_IGNORE(id));
  }

  async listIssues(filter: IssuesFilter = {}): Promise<PaginatedResponse<GovernanceIssue>> {
    const { page = 1, size = config.defaultPageSize, type, severity, status, systemCode, responsible, q } = filter;

    const response = await apiClient.get<unknown>(API_ENDPOINTS.GOVERNANCE_ISSUES, {
      params: { page, size, type, severity, status, systemCode, responsible, q },
    });

    return normalizePaginatedResponse<GovernanceIssue>(response, page, size);
  }

  async assignIssue(
    id: string,
    responsible: string,
    options: { dueDate?: string; createTicket?: boolean } = {}
  ): Promise<GovernanceIssue> {
    const { dueDate, ...restOptions } = options;
    const formattedDueDate = this.formatDueDateForAssign(dueDate);

    return apiClient.post<GovernanceIssue>(API_ENDPOINTS.GOVERNANCE_ISSUE_ASSIGN(id), {
      responsible,
      ...restOptions,
      ...(formattedDueDate ? { dueDate: formattedDueDate } : {}),
    });
  }

  async changeStatus(id: string, status: IssueStatus): Promise<GovernanceIssue> {
    return apiClient.patch<GovernanceIssue>(API_ENDPOINTS.GOVERNANCE_ISSUE_STATUS(id), { status });
  }

  async getHistory(id: string): Promise<IssueHistoryEntry[]> {
    const response = await apiClient.get<unknown>(API_ENDPOINTS.GOVERNANCE_ISSUE_HISTORY(id));
    return normalizeArrayResponse<IssueHistoryEntry>(response);
  }

  async getIssueDetails(id: string): Promise<GovernanceIssueDetail> {
    const response = await apiClient.get<unknown>(API_ENDPOINTS.GOVERNANCE_ISSUE_BY_ID(id));
    return normalizeIssueDetail(response);
  }

  async ignoreIssue(id: string, reason: string): Promise<GovernanceIssue> {
    return apiClient.patch<GovernanceIssue>(API_ENDPOINTS.GOVERNANCE_ISSUE_STATUS(id), {
      status: 'IGNORED',
      reason,
    });
  }

  async getSuggestedAssignee(id: string): Promise<GovernanceSuggestedAssignee> {
    const response = await apiClient.get<unknown>(API_ENDPOINTS.GOVERNANCE_ISSUE_SUGGESTED_ASSIGNEE(id));
    if (Array.isArray(response)) {
      return { suggested: normalizeResponsible(response[0]) ?? null, alternatives: normalizeResponsibleList(response) };
    }

    const data = response as Record<string, unknown> | null;
    const suggested =
      normalizeResponsible(data?.suggestedAssignee ?? data?.suggested ?? data?.assignee ?? data?.data ?? data) ?? null;
    const alternatives = normalizeResponsibleList(data?.alternatives ?? data?.options ?? data?.others ?? []);

    return { suggested, alternatives };
  }

  async getResponsiblesSummary(): Promise<GovernanceResponsiblesSummary> {
    const response = await apiClient.get<unknown>(API_ENDPOINTS.GOVERNANCE_RESPONSIBLES_SUMMARY);
    const data = response as Record<string, unknown> | null;
    const responsibles = normalizeResponsibleList(
      data?.responsibles ?? data?.data ?? data?.items ?? data?.content ?? response
    );
    const summaryData = (data?.summary as Record<string, unknown>) ?? data ?? {};

    return {
      totalResponsibles:
        (summaryData.totalResponsibles as number) ??
        (summaryData.responsiblesTotal as number) ??
        responsibles.length ??
        null,
      totalOpenIssues:
        (summaryData.totalOpenIssues as number) ??
        (summaryData.openIssuesTotal as number) ??
        (summaryData.issuesOpenTotal as number) ??
        null,
      totalOverdue:
        (summaryData.totalOverdue as number) ??
        (summaryData.overdueTotal as number) ??
        (summaryData.overdueIssuesTotal as number) ??
        null,
      responsibles,
    };
  }
}

export const governanceService = new GovernanceService();
