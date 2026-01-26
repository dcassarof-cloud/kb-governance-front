// =====================================================
// SYSTEMS SERVICE - Consisa KB Governance
// =====================================================

import { config, API_ENDPOINTS } from '@/config/app-config';
import { apiClient } from './api-client.service';
import { KbSystem } from '@/types';
import { mockSystems } from '@/data/mock-data';

class SystemsService {
  async getSystems(): Promise<KbSystem[]> {
    if (config.useMockData) {
      await new Promise(resolve => setTimeout(resolve, 400));
      return mockSystems;
    }

    // TODO: Habilitar quando API estiver disponível
    return apiClient.get<KbSystem[]>(API_ENDPOINTS.SYSTEMS);
  }

  async getSystemById(id: string): Promise<KbSystem | null> {
    if (config.useMockData) {
      await new Promise(resolve => setTimeout(resolve, 300));
      return mockSystems.find(s => s.id === id) || null;
    }

    // TODO: Habilitar quando API estiver disponível
    return apiClient.get<KbSystem>(API_ENDPOINTS.SYSTEM_BY_ID(id));
  }

  async toggleSystemStatus(id: string, isActive: boolean): Promise<KbSystem> {
    if (config.useMockData) {
      await new Promise(resolve => setTimeout(resolve, 300));
      const system = mockSystems.find(s => s.id === id);
      if (system) {
        system.isActive = isActive;
        return system;
      }
      throw new Error('System not found');
    }

    // TODO: Habilitar quando API estiver disponível
    return apiClient.put<KbSystem>(API_ENDPOINTS.SYSTEM_BY_ID(id), { isActive });
  }
}

export const systemsService = new SystemsService();
