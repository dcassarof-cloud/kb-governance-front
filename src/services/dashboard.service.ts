// =====================================================
// DASHBOARD SERVICE - Consisa KB Governance
// =====================================================

import { config, API_ENDPOINTS } from '@/config/app-config';
import { apiClient } from './api-client.service';
import { DashboardSummary } from '@/types';
import { mockDashboardSummary } from '@/data/mock-data';

// Helper: Normaliza resposta do dashboard com valores padrão
function normalizeDashboardSummary(response: unknown): DashboardSummary {
  const defaultSummary: DashboardSummary = {
    totalArticles: 0,
    okCount: 0,
    issuesCount: 0,
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
    okCount: typeof obj.okCount === 'number' ? obj.okCount : 0,
    issuesCount: typeof obj.issuesCount === 'number' ? obj.issuesCount : 0,
    duplicatesCount: typeof obj.duplicatesCount === 'number' ? obj.duplicatesCount : 0,
    bySystem: Array.isArray(obj.bySystem) ? obj.bySystem : [],
    byStatus: Array.isArray(obj.byStatus) ? obj.byStatus : [],
  };
}

class DashboardService {
  async getSummary(): Promise<DashboardSummary> {
    if (config.useMockData) {
      // Simula delay de rede
      await new Promise(resolve => setTimeout(resolve, 500));
      return normalizeDashboardSummary(mockDashboardSummary);
    }

    if (config.debug) {
      console.log('[DashboardService] apiBaseUrl =', config.apiBaseUrl);
      console.log('[DashboardService] endpoint =', API_ENDPOINTS.DASHBOARD_SUMMARY);
    }

    // Chamada à API real com normalização de resposta
    const response = await apiClient.get<unknown>(API_ENDPOINTS.DASHBOARD_SUMMARY);
    return normalizeDashboardSummary(response);
  }
}

export const dashboardService = new DashboardService();
