// =====================================================
// GOVERNANCE SERVICE - Consisa KB Governance
// =====================================================

import { API_BASE_URL, config, API_ENDPOINTS } from '@/config/app-config';
import { apiClient } from './api-client.service';
import { authService } from './auth.service';

import { normalizeEnum } from '@/lib/api-normalizers';
import { governanceTexts } from '@/governanceTexts';
import { cleanQueryParams } from '@/lib/clean-query-params';
import {
  GovernanceIssueDto,
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
  GovernanceOverviewDto,
  GovernanceIssueHistoryDto,
} from '@/types';

export interface IssuesFilter {
  page?: number;
  size?: number;
  type?: IssueType;
  severity?: IssueSeverity;
  status?: IssueStatus;
  systemCode?: string;
  responsibleType?: string;
  responsibleId?: string;
  q?: string;
  overdue?: boolean;
  unassigned?: boolean;
  sort?: string;
  signal?: AbortSignal;
}


export interface ResponsibleOption {
  value: string;
  label: string;
}

export interface ResponsiblesOptionsResult {
  options: ResponsibleOption[];
  usedFallback: boolean;
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
 * Helper: Normaliza resposta de array (suporta items, content, data, ou array direto)
 */
const ALLOWED_ISSUE_SEVERITIES: IssueSeverity[] = ['INFO', 'WARN', 'ERROR'];

const normalizeIssueSeverity = (value: unknown, fallback: IssueSeverity = 'INFO'): IssueSeverity => {
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim().toUpperCase();
  return ALLOWED_ISSUE_SEVERITIES.includes(normalized as IssueSeverity)
    ? (normalized as IssueSeverity)
    : fallback;
};

const toIsoDateTime = (value?: string): string | undefined => {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toISOString();
};

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


const normalizeResponsibleOption = (response: unknown): ResponsibleOption | null => {
  if (!response || typeof response !== 'object') return null;
  const obj = response as Record<string, unknown>;
  const value = obj.id ?? obj.userId ?? obj.email ?? obj.userEmail;
  if (value === null || value === undefined) return null;

  const displayName =
    (obj.displayName as string) ??
    (obj.name as string) ??
    (obj.fullName as string) ??
    (obj.email as string) ??
    (obj.userEmail as string) ??
    String(value);

  return {
    value: String(value),
    label: displayName,
  };
};


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

export const normalizeGovernanceIssue = (response: unknown): GovernanceIssueDto => {
  if (!response || typeof response !== 'object') {
    return {
      id: '',
      type: 'INCOMPLETE_CONTENT',
      severity: 'INFO',
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

  return {
    id: issueData.id ? String(issueData.id) : (issueData.issueId as string) ?? '',
    type:
      (issueData.type as IssueType) ??
      (issueData.issueType as IssueType) ??
      'INCOMPLETE_CONTENT',
    typeDisplayName:
      (issueData.typeDisplayName as string) ??
      (issueData.type_display_name as string) ??
      (issueData.displayName as string) ??
      null,
    severity: normalizeIssueSeverity(issueData.severity ?? issueData.issueSeverity, 'INFO'),
    priorityLevel: normalizeIssueSeverity(
      issueData.priorityLevel ?? issueData.priority ?? issueData.severity ?? issueData.issueSeverity,
      normalizeIssueSeverity(issueData.severity ?? issueData.issueSeverity, 'INFO')
    ),
    articleId:
      (issueData.articleId as string) ??
      (issueData.manualId as string) ??
      (issueData.article_id as string) ??
      '',
    articleTitle:
      (issueData.articleTitle as string) ??
      (issueData.title as string) ??
      (issueData.article_title as string) ??
      '',
    systemCode:
      (issueData.systemCode as string) ??
      (issueData.system_code as string) ??
      (issueData.system as string) ??
      '',
    status:
      (normalizeEnum(issueData.status ?? issueData.issueStatus) as IssueStatus) ??
      'OPEN',
    createdAt:
      (issueData.createdAt as string) ??
      (issueData.created_at as string) ??
      '',
    details:
      (issueData.details as string) ??
      (issueData.message as string) ??
      (issueData.description as string) ??
      '',
    responsible:
      (issueData.assignedAgentName as string) ??
      (issueData.responsible as string) ??
      (issueData.assignee as string) ??
      null,
    responsibleId:
      (issueData.assignedAgentId as string) ??
      (issueData.responsibleId as string) ??
      (issueData.responsible_id as string) ??
      null,
    responsibleType:
      (issueData.responsibleType as string) ??
      (issueData.responsible_type as string) ??
      null,
    responsibleName:
      (issueData.responsibleName as string) ??
      (issueData.responsible_name as string) ??
      null,
    dueDate:
      (issueData.dueDate as string) ??
      (issueData.due_date as string) ??
      null,
    assignedAgentId:
      (issueData.assignedAgentId as string) ??
      (issueData.assigned_agent_id as string) ??
      (issueData.responsibleId as string) ??
      null,
    assignedAgentName:
      (issueData.assignedAgentName as string) ??
      (issueData.assigned_agent_name as string) ??
      (issueData.responsibleName as string) ??
      (issueData.responsible as string) ??
      null,
    slaDueAt:
      (issueData.slaDueAt as string) ??
      (issueData.sla_due_at as string) ??
      null,
    slaDays:
      (issueData.slaDays as number) ??
      (issueData.sla_days as number) ??
      null,
    systemName:
      (issueData.systemName as string) ??
      (issueData.system_name as string) ??
      null,
    message:
      (issueData.message as string) ??
      (issueData.details as string) ??
      null,
    title:
      (issueData.title as string) ??
      (issueData.articleTitle as string) ??
      null,
    duplicateHash:
      (issueData.duplicateHash as string) ??
      (issueData.contentHash as string) ??
      (issueData.duplicate_hash as string) ??
      null,
    displayName:
      (issueData.displayName as string) ??
      (issueData.typeDisplayName as string) ??
      (issueData.type_display_name as string) ??
      null,
    description:
      (issueData.description as string) ??
      (issueData.details as string) ??
      null,
    recommendation:
      (issueData.recommendation as string) ??
      (issueData.recommendedAction as string) ??
      null,
    metadata:
      (issueData.metadata as Record<string, unknown>) ??
      null,
  };
};

const normalizeIssueDetail = (response: unknown): GovernanceIssueDetail => {
  if (!response || typeof response !== 'object') {
    return normalizeGovernanceIssue(response);
  }

  const raw = response as Record<string, unknown>;
  const issueData = (raw.issue as Record<string, unknown>) ?? (raw.data as Record<string, unknown>) ?? raw;

  const duplicateGroup =
    normalizeDuplicateGroup(issueData?.duplicateGroup ?? issueData?.duplicates ?? issueData?.duplicateArticles ?? null) ??
    normalizeDuplicateGroup(raw?.duplicateGroup ?? raw?.duplicates ?? raw?.duplicateArticles ?? null);

  return {
    ...(normalizeGovernanceIssue(issueData) as GovernanceIssueDetail),
    duplicateGroup,
    duplicateHash:
      (issueData.duplicateHash as string) ??
      (issueData.contentHash as string) ??
      (raw.duplicateHash as string) ??
      (raw.contentHash as string) ??
      null,
  };
};

export const normalizeGovernanceOverview = (response: unknown): GovernanceOverviewDto => {
  if (!response || typeof response !== 'object') {
    return {};
  }

  const raw = response as Record<string, unknown>;
  const systemsRaw = (raw.systems as unknown) ?? (raw.bySystem as unknown) ?? (raw.systemStats as unknown) ?? [];
  const systems = Array.isArray(systemsRaw)
    ? systemsRaw.map((item) => {
        const obj = item as Record<string, unknown>;
        return {
          systemCode: (obj.systemCode as string) ?? (obj.code as string) ?? '',
          systemName: (obj.systemName as string) ?? (obj.name as string) ?? null,
          healthScore: (obj.healthScore as number) ?? (obj.qualityScore as number) ?? null,
          openIssues: (obj.openIssues as number) ?? (obj.openTotal as number) ?? null,
          errorOpen: (obj.errorOpen as number) ?? (obj.criticalOpen as number) ?? null,
          overdueOpen: (obj.overdueOpen as number) ?? (obj.overdueIssues as number) ?? null,
          unassignedOpen:
            (obj.unassignedOpen as number) ?? (obj.unassignedIssues as number) ?? (obj.withoutResponsible as number) ?? null,
        };
      })
    : [];

  return {
    openTotal: (raw.openTotal as number) ?? (raw.openIssues as number) ?? (raw.totalOpen as number) ?? null,
    errorOpen:
      (raw.errorOpen as number) ?? (raw.criticalOpen as number) ?? (raw.errorIssues as number) ?? null,
    criticalOpen: (raw.criticalOpen as number) ?? null,
    unassignedOpen:
      (raw.unassignedOpen as number) ?? (raw.unassignedIssues as number) ?? (raw.withoutResponsible as number) ?? null,
    overdueOpen: (raw.overdueOpen as number) ?? (raw.overdueIssues as number) ?? (raw.lateOpen as number) ?? null,
    systems: systems.filter((system) => Boolean(system.systemCode)),
  };
};

const normalizeHistoryValue = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const normalizeIssueHistory = (response: unknown): GovernanceIssueHistoryDto[] => {
  const entries = normalizeArrayResponse<Record<string, unknown>>(response);
  return entries.map((entry) => ({
    id: entry.id ? String(entry.id) : undefined,
    changedAt:
      (entry.changedAt as string) ??
      (entry.updatedAt as string) ??
      (entry.createdAt as string) ??
      '',
    field: (entry.field as string) ?? (entry.attribute as string) ?? (entry.property as string) ?? null,
    oldValue: normalizeHistoryValue(entry.oldValue ?? entry.previousValue ?? entry.from),
    newValue: normalizeHistoryValue(entry.newValue ?? entry.currentValue ?? entry.to),
    changedBy: (entry.changedBy as string) ?? (entry.user as string) ?? null,
    note: (entry.note as string) ?? (entry.reason as string) ?? null,
    status: (entry.status as IssueStatus) ?? (entry.toStatus as IssueStatus) ?? null,
  }));
};

class GovernanceService {
  private formatDueDateForAssign(dueDate?: string): string | undefined {
    if (!dueDate) return undefined;
    const datePart = dueDate.split('T')[0]?.split(' ')[0] ?? dueDate;
    return datePart;
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

  async getOverview(): Promise<GovernanceOverviewDto> {
    const response = await apiClient.get<unknown>(API_ENDPOINTS.GOVERNANCE_OVERVIEW);
    const overview = normalizeGovernanceOverview(response);

    if (overview.errorOpen === null && overview.criticalOpen !== null) {
      return { ...overview, errorOpen: overview.criticalOpen };
    }

    return overview;
  }

  /**
   * Lista manuais/artigos para a tela de governança.
   * Backend esperado: GET /api/v1/governance/manuals
   */
  async listManuals(filter: GovernanceManualFilters = {}): Promise<PaginatedResponse<GovernanceManual>> {
    const { page = 1, size = config.defaultPageSize, system, status, q } = filter;

    const response = await apiClient.getPaginated<GovernanceManual>(API_ENDPOINTS.GOVERNANCE_MANUALS, {
      params: { page, size, system, status, q },
      page,
      size,
    });

    return response;
  }

  async assignManual(id: string, responsible: string): Promise<void> {
    const actor = authService.getActorIdentifier() ?? 'system';
    await apiClient.post(API_ENDPOINTS.GOVERNANCE_MANUAL_ASSIGN(id), { responsible, actor });
  }

  async reviewManual(id: string): Promise<void> {
    const actor = authService.getActorIdentifier() ?? 'system';
    await apiClient.post(API_ENDPOINTS.GOVERNANCE_MANUAL_REVIEW(id), { actor });
  }

  async moveManual(id: string): Promise<void> {
    const actor = authService.getActorIdentifier() ?? 'system';
    await apiClient.post(API_ENDPOINTS.GOVERNANCE_MANUAL_MOVE(id), { actor });
  }

  async mergeManual(id: string): Promise<void> {
    const actor = authService.getActorIdentifier() ?? 'system';
    await apiClient.post(API_ENDPOINTS.GOVERNANCE_MANUAL_MERGE(id), { actor });
  }

  async resolveManual(id: string): Promise<void> {
    const actor = authService.getActorIdentifier() ?? 'system';
    await apiClient.post(API_ENDPOINTS.GOVERNANCE_MANUAL_RESOLVE(id), { actor });
  }

  async ignoreManual(id: string): Promise<void> {
    const actor = authService.getActorIdentifier() ?? 'system';
    await apiClient.post(API_ENDPOINTS.GOVERNANCE_MANUAL_IGNORE(id), { actor });
  }

  async listIssues(filter: IssuesFilter = {}): Promise<PaginatedResponse<GovernanceIssueDto>> {
    const {
      page = 1,
      size = config.defaultPageSize,
      type,
      severity,
      status,
      systemCode,
      responsibleType,
      responsibleId,
      q,
      overdue,
      unassigned,
      sort,
      signal,
    } = filter;

    const response = await apiClient.getPaginated<unknown>(API_ENDPOINTS.GOVERNANCE_ISSUES, {
      params: cleanQueryParams({
        page,
        size,
        sort,
        issueType: type,
        severity,
        status,
        systemCode,
        responsibleType,
        responsibleId,
        q,
        overdue,
        unassigned,
      }),
      signal,
      page,
      size,
    });

    return {
      ...response,
      data: response.data.map((item) => normalizeGovernanceIssue(item)),
    };
  }

  async assignIssue(
    id: string,
    options: { dueDate?: string; createTicket?: boolean; responsibleType?: string; responsibleId?: string } = {}
  ): Promise<GovernanceIssueDto> {
    const { dueDate, responsibleType, responsibleId, ...restOptions } = options;
    const formattedDueDate = this.formatDueDateForAssign(dueDate);

    const response = await apiClient.post<unknown>(API_ENDPOINTS.GOVERNANCE_ISSUE_ASSIGN(id), {
      assignee: responsibleId ?? '',
      ...(formattedDueDate ? { dueDate: formattedDueDate } : {}),
      actor: authService.getActorIdentifier() ?? 'system',
    });
    return normalizeGovernanceIssue(response);
  }

  async changeStatus(id: string, status: IssueStatus, ignoredReason?: string): Promise<GovernanceIssueDto> {
    if (status === 'IGNORED') {
      return this.ignoreIssue(id, ignoredReason ?? '');
    }
    if (status === 'OPEN') {
      return this.revalidateIssue(id);
    }

    const response = await apiClient.put<unknown>(API_ENDPOINTS.GOVERNANCE_ISSUE_STATUS(id), {
      status,
      ...(ignoredReason ? { ignoredReason } : {}),
      actor: authService.getActorIdentifier() ?? 'system',
    });
    return normalizeGovernanceIssue(response);
  }

  async getHistory(id: string): Promise<IssueHistoryEntry[]> {
    const response = await apiClient.get<unknown>(API_ENDPOINTS.GOVERNANCE_ISSUE_HISTORY(id));
    return normalizeArrayResponse<IssueHistoryEntry>(response);
  }

  async getIssueHistory(id: string): Promise<GovernanceIssueHistoryDto[]> {
    const response = await apiClient.get<unknown>(API_ENDPOINTS.GOVERNANCE_ISSUE_HISTORY(id));
    return normalizeIssueHistory(response);
  }

  async getIssueById(id: string): Promise<GovernanceIssueDetail> {
    const response = await apiClient.get<unknown>(API_ENDPOINTS.GOVERNANCE_ISSUE_BY_ID(id));
    return normalizeIssueDetail(response);
  }

  async ignoreIssue(id: string, reason: string): Promise<GovernanceIssueDto> {
    const response = await apiClient.patch<unknown>(API_ENDPOINTS.GOVERNANCE_ISSUE_IGNORE(id), {
      ignoredReason: reason,
      actor: authService.getActorIdentifier() ?? 'system',
    });
    return normalizeGovernanceIssue(response);
  }

  async revalidateIssue(id: string): Promise<GovernanceIssueDto> {
    const response = await apiClient.post<unknown>(API_ENDPOINTS.GOVERNANCE_ISSUE_REVALIDATE(id), {
      actor: authService.getActorIdentifier() ?? 'system',
    });
    return normalizeGovernanceIssue(response);
  }

  async getSuggestedAssignee(query: string): Promise<GovernanceSuggestedAssignee> {
    const response = await apiClient.get<unknown>(API_ENDPOINTS.GOVERNANCE_RESPONSIBLES_SUGGEST, {
      params: { q: query || undefined },
    });

    if (Array.isArray(response)) {
      const alternatives = response.reduce<GovernanceResponsible[]>((acc, item) => {
        if (!item || typeof item !== 'object') return acc;
        const obj = item as Record<string, unknown>;
        const name = typeof obj.name === 'string' ? obj.name : null;
        if (!name) return acc;
        const id = obj.id ? String(obj.id) : undefined;
        acc.push({ id, name, email: null });
        return acc;
      }, []);

      return { suggested: alternatives[0] ?? null, alternatives };
    }

    const data = response as Record<string, unknown> | null;
    const alternatives = normalizeResponsibleList(
      data?.alternatives ?? data?.options ?? data?.items ?? data?.content ?? data?.data ?? response
    );

    return { suggested: alternatives[0] ?? null, alternatives };
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

  async getResponsiblesOptions(): Promise<ResponsiblesOptionsResult> {
    try {
      const response = await apiClient.get<unknown>(API_ENDPOINTS.USERS_RESPONSIBLES);
      const options = normalizeArrayResponse<unknown>(response)
        .map((item) => normalizeResponsibleOption(item))
        .filter((item): item is ResponsibleOption => Boolean(item));

      return {
        options,
        usedFallback: false,
      };
    } catch {
      const summary = await this.getResponsiblesSummary();
      const options = (summary.responsibles ?? []).map((responsible) => ({
        value: responsible.id ?? responsible.email ?? responsible.name,
        label: responsible.name || responsible.email || governanceTexts.general.notAvailable,
      }));

      return {
        options,
        usedFallback: true,
      };
    }
  }

  async downloadManualUpdatesReport(params: {
    systemCode?: string;
    status?: string;
    start?: string;
    end?: string;
  }): Promise<Blob> {
    const token = authService.getAccessToken();
    const url = new URL(`${API_BASE_URL}${API_ENDPOINTS.REPORTS_MANUAL_UPDATES}`);

    const queryParams = cleanQueryParams({
      systemCode: params.systemCode,
      status: params.status,
      start: toIsoDateTime(params.start),
      end: toIsoDateTime(params.end),
      format: 'csv',
    });

    Object.entries(queryParams).forEach(([key, value]) => {
      url.searchParams.set(key, String(value));
    });

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'X-Correlation-Id': typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now()),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      let message = `Falha ao gerar relatório (HTTP ${response.status}).`;
      try {
        const body = await response.json() as { message?: string; correlationId?: string };
        if (body?.message) {
          message = body.message;
        }
        if (body?.correlationId) {
          message = `${message} CorrelationId: ${body.correlationId}`;
        }
      } catch {
        // noop
      }
      throw new Error(message);
    }

    return response.blob();
  }
}

export const governanceService = new GovernanceService();
