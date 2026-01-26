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

class SyncService {
  async getSyncRuns(): Promise<SyncRun[]> {
    if (config.useMockData) {
      await new Promise(resolve => setTimeout(resolve, 400));
      return mockSyncRuns;
    }

    // TODO: Habilitar quando API estiver disponível
    return apiClient.get<SyncRun[]>(API_ENDPOINTS.SYNC_RUNS);
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

    // TODO: Habilitar quando API estiver disponível
    return apiClient.post<SyncRun>(API_ENDPOINTS.SYNC_TRIGGER, request);
  }

  async getSyncConfig(): Promise<SyncConfig> {
    if (config.useMockData) {
      await new Promise(resolve => setTimeout(resolve, 300));
      return mockSyncConfig;
    }

    // TODO: Habilitar quando API estiver disponível
    return apiClient.get<SyncConfig>(API_ENDPOINTS.SYNC_CONFIG);
  }

  async updateSyncConfig(configData: Partial<SyncConfig>): Promise<SyncConfig> {
    if (config.useMockData) {
      await new Promise(resolve => setTimeout(resolve, 400));
      Object.assign(mockSyncConfig, configData);
      return mockSyncConfig;
    }

    // TODO: Habilitar quando API estiver disponível
    return apiClient.put<SyncConfig>(API_ENDPOINTS.SYNC_CONFIG, configData);
  }
}

export const syncService = new SyncService();
