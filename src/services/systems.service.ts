// =====================================================
// SYSTEMS SERVICE - Consisa KB Governance
// =====================================================

import { config, API_ENDPOINTS } from '@/config/app-config';
import { apiClient } from './api-client.service';
import { KbSystem } from '@/types';
import { mockSystems } from '@/data/mock-data';

// Helper: Normaliza resposta de array (suporta items, content, data, ou array direto)
function normalizeArrayResponse<T>(response: unknown): T[] {
  // Se é um array direto
  if (Array.isArray(response)) {
    return response;
  }

  // Se é um objeto, tenta extrair array de diferentes campos
  if (response && typeof response === 'object') {
    const obj = response as Record<string, unknown>;
    const items = obj.data || obj.items || obj.content || [];
    if (Array.isArray(items)) {
      return items as T[];
    }
  }

  // Fallback: retorna array vazio
  return [];
}

class SystemsService {
  async getSystems(): Promise<KbSystem[]> {
    if (config.useMockData) {
      await new Promise(resolve => setTimeout(resolve, 400));
      return Array.isArray(mockSystems) ? mockSystems : [];
    }

    // Chamada à API real com normalização de resposta
    const response = await apiClient.get<unknown>(API_ENDPOINTS.SYSTEMS);
    return normalizeArrayResponse<KbSystem>(response);
  }

  async getSystemById(id: string): Promise<KbSystem | null> {
    if (config.useMockData) {
      await new Promise(resolve => setTimeout(resolve, 300));
      const systems = Array.isArray(mockSystems) ? mockSystems : [];
      return systems.find(s => s?.id === id) || null;
    }

    // Chamada à API real
    try {
      const response = await apiClient.get<KbSystem>(API_ENDPOINTS.SYSTEM_BY_ID(id));
      return response || null;
    } catch {
      return null;
    }
  }

  async toggleSystemStatus(id: string, isActive: boolean): Promise<KbSystem> {
    if (config.useMockData) {
      await new Promise(resolve => setTimeout(resolve, 300));
      const systems = Array.isArray(mockSystems) ? mockSystems : [];
      const system = systems.find(s => s?.id === id);
      if (system) {
        system.isActive = isActive;
        return system;
      }
      throw new Error('System not found');
    }

    // Chamada à API real
    return apiClient.put<KbSystem>(API_ENDPOINTS.SYSTEM_BY_ID(id), { isActive });
  }
}

export const systemsService = new SystemsService();
