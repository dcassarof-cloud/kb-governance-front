// =====================================================
// GOVERNANCE SERVICE - Consisa KB Governance
// =====================================================

import { config, API_ENDPOINTS } from '@/config/app-config';
import { apiClient } from './api-client.service';

import {
  GovernanceIssue,
  DuplicateGroup,
  IssueType,
  IssueSeverity,
  IssueStatus,
  PaginatedResponse,
  GovernanceSummary,
  GovernanceManual,
} from '@/types';

import { mockIssues, mockDuplicates } from '@/data/mock-data';

export interface IssuesFilter {
  page?: number;
  size?: number;
  type?: IssueType;
  severity?: IssueSeverity;
  status?: IssueStatus;
  systemCode?: string;
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

class GovernanceService {
  async getSummary(): Promise<GovernanceSummary> {
    if (config.useMockData) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return {
        openIssues: 0,
        criticalManuals: 0,
        slaBreached: 0,
        aiReadyPercentage: 0,
      };
    }

    const response = await apiClient.get<unknown>(API_ENDPOINTS.GOVERNANCE_SUMMARY);
    const data = response as Record<string, unknown> | null;

    return {
      openIssues: (data?.openIssues as number) ?? (data?.issuesOpen as number) ?? 0,
      criticalManuals: (data?.criticalManuals as number) ?? (data?.manualsCritical as number) ?? 0,
      slaBreached: (data?.slaBreached as number) ?? (data?.slaOverdue as number) ?? 0,
      aiReadyPercentage: (data?.aiReadyPercentage as number) ?? (data?.aiReadyPercent as number) ?? 0,
    };
  }

  /**
   * Lista manuais/artigos para a tela de governança.
   * Backend esperado: GET /api/v1/governance/manuals
   */
  async listManuals(filter: GovernanceManualFilters = {}): Promise<PaginatedResponse<GovernanceManual>> {
    const { page = 1, size = config.defaultPageSize, system, status, q } = filter;

    if (config.useMockData) {
      await new Promise((resolve) => setTimeout(resolve, 400));
      return {
        data: [],
        total: 0,
        page,
        size,
        totalPages: 0,
      };
    }

    const response = await apiClient.get<unknown>(API_ENDPOINTS.GOVERNANCE_MANUALS, {
      params: { page, size, system, status, q },
    });

    return normalizePaginatedResponse<GovernanceManual>(response, page, size);
  }

  async assignManual(id: string, responsible: string): Promise<void> {
    if (config.useMockData) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return;
    }
    await apiClient.post(API_ENDPOINTS.GOVERNANCE_MANUAL_ASSIGN(id), { responsible });
  }

  async reviewManual(id: string): Promise<void> {
    if (config.useMockData) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return;
    }
    await apiClient.post(API_ENDPOINTS.GOVERNANCE_MANUAL_REVIEW(id));
  }

  async moveManual(id: string): Promise<void> {
    if (config.useMockData) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return;
    }
    await apiClient.post(API_ENDPOINTS.GOVERNANCE_MANUAL_MOVE(id));
  }

  async mergeManual(id: string): Promise<void> {
    if (config.useMockData) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return;
    }
    await apiClient.post(API_ENDPOINTS.GOVERNANCE_MANUAL_MERGE(id));
  }

  async resolveManual(id: string): Promise<void> {
    if (config.useMockData) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return;
    }
    await apiClient.post(API_ENDPOINTS.GOVERNANCE_MANUAL_RESOLVE(id));
  }

  async ignoreManual(id: string): Promise<void> {
    if (config.useMockData) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return;
    }
    await apiClient.post(API_ENDPOINTS.GOVERNANCE_MANUAL_IGNORE(id));
  }

  async getIssues(filter: IssuesFilter = {}): Promise<PaginatedResponse<GovernanceIssue>> {
    const { page = 1, size = config.defaultPageSize, type, severity, status, systemCode } = filter;

    if (config.useMockData) {
      await new Promise((resolve) => setTimeout(resolve, 400));

      let filtered = Array.isArray(mockIssues) ? [...mockIssues] : [];

      if (type) filtered = filtered.filter((i) => i?.type === type);
      if (severity) filtered = filtered.filter((i) => i?.severity === severity);
      if (status) filtered = filtered.filter((i) => i?.status === status);
      if (systemCode) filtered = filtered.filter((i) => i?.systemCode === systemCode);

      const total = filtered.length;
      const start = (page - 1) * size;
      const data = filtered.slice(start, start + size);

      return {
        data,
        total,
        page,
        size,
        totalPages: Math.ceil(total / size) || 1,
      };
    }

    const response = await apiClient.get<unknown>(API_ENDPOINTS.GOVERNANCE_ISSUES, {
      params: { page, size, type, severity, status, systemCode },
    });

    return normalizePaginatedResponse<GovernanceIssue>(response, page, size);
  }

  async getDuplicates(): Promise<DuplicateGroup[]> {
    if (config.useMockData) {
      await new Promise((resolve) => setTimeout(resolve, 400));
      return Array.isArray(mockDuplicates) ? mockDuplicates : [];
    }

    const response = await apiClient.get<unknown>(API_ENDPOINTS.GOVERNANCE_DUPLICATES);
    return normalizeArrayResponse<DuplicateGroup>(response);
  }

  async updateIssueStatus(id: string, status: IssueStatus): Promise<GovernanceIssue> {
    if (config.useMockData) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      const issues = Array.isArray(mockIssues) ? mockIssues : [];
      const issue = issues.find((i) => i?.id === id);
      if (issue) {
        issue.status = status;
        return issue;
      }
      throw new Error('Issue not found');
    }

    return apiClient.put<GovernanceIssue>(API_ENDPOINTS.GOVERNANCE_ISSUE_BY_ID(id), { status });
  }
}

export const governanceService = new GovernanceService();
