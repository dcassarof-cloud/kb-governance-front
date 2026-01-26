// =====================================================
// GOVERNANCE SERVICE - Consisa KB Governance
// =====================================================

import { config, API_ENDPOINTS } from '@/config/app-config';
import { apiClient } from './api-client.service';
import { GovernanceIssue, DuplicateGroup, IssueType, IssueSeverity, IssueStatus, PaginatedResponse } from '@/types';
import { mockIssues, mockDuplicates } from '@/data/mock-data';

export interface IssuesFilter {
  page?: number;
  size?: number;
  type?: IssueType;
  severity?: IssueSeverity;
  status?: IssueStatus;
  systemCode?: string;
}

class GovernanceService {
  async getIssues(filter: IssuesFilter = {}): Promise<PaginatedResponse<GovernanceIssue>> {
    const { page = 1, size = config.defaultPageSize, type, severity, status, systemCode } = filter;

    if (config.useMockData) {
      await new Promise(resolve => setTimeout(resolve, 400));

      let filtered = [...mockIssues];

      if (type) filtered = filtered.filter(i => i.type === type);
      if (severity) filtered = filtered.filter(i => i.severity === severity);
      if (status) filtered = filtered.filter(i => i.status === status);
      if (systemCode) filtered = filtered.filter(i => i.systemCode === systemCode);

      const total = filtered.length;
      const start = (page - 1) * size;
      const data = filtered.slice(start, start + size);

      return {
        data,
        total,
        page,
        size,
        totalPages: Math.ceil(total / size),
      };
    }

    // TODO: Habilitar quando API estiver disponível
    return apiClient.get<PaginatedResponse<GovernanceIssue>>(API_ENDPOINTS.GOVERNANCE_ISSUES, {
      params: { page, size, type, severity, status, systemCode },
    });
  }

  async getDuplicates(): Promise<DuplicateGroup[]> {
    if (config.useMockData) {
      await new Promise(resolve => setTimeout(resolve, 400));
      return mockDuplicates;
    }

    // TODO: Habilitar quando API estiver disponível
    return apiClient.get<DuplicateGroup[]>(API_ENDPOINTS.GOVERNANCE_DUPLICATES);
  }

  async updateIssueStatus(id: string, status: IssueStatus): Promise<GovernanceIssue> {
    if (config.useMockData) {
      await new Promise(resolve => setTimeout(resolve, 300));
      const issue = mockIssues.find(i => i.id === id);
      if (issue) {
        issue.status = status;
        return issue;
      }
      throw new Error('Issue not found');
    }

    // TODO: Habilitar quando API estiver disponível
    return apiClient.put<GovernanceIssue>(API_ENDPOINTS.GOVERNANCE_ISSUE_BY_ID(id), { status });
  }
}

export const governanceService = new GovernanceService();
