// =====================================================
// SYNC SERVICE - Consisa KB Governance
// =====================================================

import { config, API_ENDPOINTS } from '@/config/app-config';
import { apiClient } from './api-client.service';
import { SyncRun, SyncConfig, SyncMode } from '@/types';
import { mockSyncRuns, mockSyncConfig } from '@/data/mock-data';

export interface TriggerSyncRequest {
  mode: SyncMode;
  daysBack?: number;
  note?: string;
}

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

// Helper: Normaliza resposta de SyncConfig com valores padrão
function normalizeSyncConfig(response: unknown): SyncConfig {
  const defaultConfig: SyncConfig = {
    id: '',
    enabled: false,
    mode: 'INCREMENTAL',
    intervalMinutes: 60,
    daysBack: 7,
  };

  if (!response || typeof response !== 'object') {
    return defaultConfig;
  }

  const obj = response as Record<string, unknown>;

  return {
    id: typeof obj.id === 'string' ? obj.id : defaultConfig.id,
    enabled: typeof obj.enabled === 'boolean' ? obj.enabled : defaultConfig.enabled,
    mode: (obj.mode as SyncMode) || defaultConfig.mode,
    intervalMinutes: typeof obj.intervalMinutes === 'number' ? obj.intervalMinutes : defaultConfig.intervalMinutes,
    daysBack: typeof obj.daysBack === 'number' ? obj.daysBack : defaultConfig.daysBack,
  };
}

class SyncService {
  async getSyncRuns(): Promise<SyncRun[]> {
    if (config.useMockData) {
      await new Promise(resolve => setTimeout(resolve, 400));
      return Array.isArray(mockSyncRuns) ? mockSyncRuns : [];
    }

    // Chamada à API real com normalização de resposta
    const response = await apiClient.get<unknown>(API_ENDPOINTS.SYNC_RUNS);
    return normalizeArrayResponse<SyncRun>(response);
  }

  async triggerSync(request: TriggerSyncRequest): Promise<SyncRun> {
    if (config.useMockData) {
      await new Promise(resolve => setTimeout(resolve, 800));

      const newRun: SyncRun = {
        id: 'run-' + Date.now(),
        startedAt: new Date().toISOString(),
        finishedAt: null,
        status: 'RUNNING',
        mode: request.mode,
        note: request.note || 'Sync manual',
        stats: { articlesProcessed: 0, articlesCreated: 0, articlesUpdated: 0, errors: 0 },
      };

      return newRun;
    }

    // Chamada à API real
    return apiClient.post<SyncRun>(API_ENDPOINTS.SYNC_TRIGGER, request);
  }

  async getSyncConfig(): Promise<SyncConfig> {
    if (config.useMockData) {
      await new Promise(resolve => setTimeout(resolve, 300));
      return normalizeSyncConfig(mockSyncConfig);
    }

    // Chamada à API real com normalização de resposta
    const response = await apiClient.get<unknown>(API_ENDPOINTS.SYNC_CONFIG);
    return normalizeSyncConfig(response);
  }

  async updateSyncConfig(configData: Partial<SyncConfig>): Promise<SyncConfig> {
    if (config.useMockData) {
      await new Promise(resolve => setTimeout(resolve, 400));
      Object.assign(mockSyncConfig, configData);
      return normalizeSyncConfig(mockSyncConfig);
    }

    // Chamada à API real
    const response = await apiClient.put<unknown>(API_ENDPOINTS.SYNC_CONFIG, configData);
    return normalizeSyncConfig(response);
  }
}

export const syncService = new SyncService();
