// =====================================================
// DASHBOARD SERVICE - Consisa KB Governance
// =====================================================

import { config, API_ENDPOINTS } from '@/config/app-config';
import { apiClient } from './api-client.service';
import { DashboardSummary } from '@/types';
import { mockDashboardSummary } from '@/data/mock-data';

class DashboardService {
  async getSummary(): Promise<DashboardSummary> {
    if (config.useMockData) {
      // Simula delay de rede
      await new Promise(resolve => setTimeout(resolve, 500));
      return mockDashboardSummary;
    }
console.log("[DashboardService] apiBaseUrl =", config.apiBaseUrl);
console.log("[DashboardService] endpoint =", API_ENDPOINTS.DASHBOARD_SUMMARY);


    // TODO: Habilitar quando API estiver disponível
    return apiClient.get<DashboardSummary>(API_ENDPOINTS.DASHBOARD_SUMMARY);
  }
}

export const dashboardService = new DashboardService();
