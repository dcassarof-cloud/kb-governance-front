// =====================================================
// DASHBOARD SERVICE - Consisa KB Governance
// =====================================================

import { config, API_ENDPOINTS } from '@/config/app-config';
import { apiClient } from './api-client.service';
import { DashboardSummary } from '@/types';

// Helper: Normaliza resposta do dashboard com valores padrão
function normalizeDashboardSummary(response: unknown): DashboardSummary {
  const defaultSummary: DashboardSummary = {
    totalArticles: 0,
    articlesOk: 0,
    articlesWithIssues: 0,
    totalIssues: 0,
    duplicatesCount: 0,
    bySystem: [],
    byStatus: [],
  };

  if (!response || typeof response !== 'object') {
    return defaultSummary;
  }

  const obj = response as Record<string, unknown>;

  return {
    totalArticles: typeof obj.totalArticles === 'number' ? obj.totalArticles : 0,
    articlesOk: typeof obj.articlesOk === 'number' ? obj.articlesOk : (obj.okCount as number) ?? 0,
    articlesWithIssues:
      typeof obj.articlesWithIssues === 'number' ? obj.articlesWithIssues : (obj.issuesCount as number) ?? 0,
    totalIssues: typeof obj.totalIssues === 'number' ? obj.totalIssues : (obj.issuesCount as number) ?? 0,
    duplicatesCount: typeof obj.duplicatesCount === 'number' ? obj.duplicatesCount : 0,
    bySystem: Array.isArray(obj.bySystem) ? obj.bySystem : [],
    byStatus: Array.isArray(obj.byStatus) ? obj.byStatus : [],
  };
}

class DashboardService {
  async getSummary(): Promise<DashboardSummary> {
    // Chamada à API real com normalização de resposta
    const response = await apiClient.get<unknown>(API_ENDPOINTS.DASHBOARD_SUMMARY);
    return normalizeDashboardSummary(response);
  }
}

export const dashboardService = new DashboardService();
