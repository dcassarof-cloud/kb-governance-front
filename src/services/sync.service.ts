// =====================================================
// SYNC SERVICE - Consisa KB Governance
// =====================================================

import { config, API_ENDPOINTS } from '@/config/app-config';
import { apiClient } from './api-client.service';
import { SyncRun, SyncConfig, SyncMode, SyncModeLabel } from '@/types';
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

const normalizeSyncMode = (raw: unknown): SyncModeLabel => {
  if (raw === 'DELTA_WINDOW' || raw === 'DELTA') {
    return 'DELTA';
  }
  if (raw === 'FULL') {
    return 'FULL';
  }
  if (import.meta.env.DEV) {
    console.error('[sync] SyncMode desconhecido recebido do backend.', raw);
  }
  return 'DESCONHECIDO';
};

export const normalizeSyncRun = (raw: unknown): SyncRun => {
  if (!raw || typeof raw !== 'object') {
    return {
      id: '',
      startedAt: '',
      finishedAt: null,
      status: 'RUNNING',
      mode: 'DESCONHECIDO',
      note: '',
      stats: { articlesProcessed: 0, articlesCreated: 0, articlesUpdated: 0, errors: 0 },
    };
  }

  const obj = raw as Record<string, unknown>;
  const statsRaw = (obj.stats as Record<string, unknown>) ?? (obj.summary as Record<string, unknown>) ?? {};

  return {
    id: obj.id ? String(obj.id) : (obj.runId as string) ?? '',
    startedAt:
      (obj.startedAt as string) ??
      (obj.started_at as string) ??
      (obj.started as string) ??
      '',
    finishedAt:
      (obj.finishedAt as string) ??
      (obj.finished_at as string) ??
      (obj.completedAt as string) ??
      null,
    status:
      (obj.status as SyncRun['status']) ??
      (obj.state as SyncRun['status']) ??
      'RUNNING',
    mode:
      normalizeSyncMode(obj.mode ?? obj.syncMode),
    note:
      (obj.note as string) ??
      (obj.message as string) ??
      '',
    stats: {
      articlesProcessed:
        (statsRaw.articlesProcessed as number) ??
        (statsRaw.processed as number) ??
        0,
      articlesCreated:
        (statsRaw.articlesCreated as number) ??
        (statsRaw.created as number) ??
        0,
      articlesUpdated:
        (statsRaw.articlesUpdated as number) ??
        (statsRaw.updated as number) ??
        0,
      errors:
        (statsRaw.errors as number) ??
        (statsRaw.failed as number) ??
        0,
    },
  };
};

// Helper: Normaliza resposta de SyncConfig com valores padrão
function normalizeSyncConfig(response: unknown): SyncConfig {
  const defaultConfig: SyncConfig = {
    id: '',
    enabled: false,
    mode: 'FULL',
    intervalMinutes: 60,
    daysBack: 7,
  };

  if (!response || typeof response !== 'object') {
    return defaultConfig;
  }

  const obj = response as Record<string, unknown>;

  const normalizedMode = normalizeSyncMode(obj.mode);

  return {
    id: typeof obj.id === 'string' ? obj.id : defaultConfig.id,
    enabled: typeof obj.enabled === 'boolean' ? obj.enabled : defaultConfig.enabled,
    mode: normalizedMode === 'DESCONHECIDO' ? defaultConfig.mode : normalizedMode,
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
    const response = await apiClient.get<unknown>(API_ENDPOINTS.SYNC_RUNS_LATEST);
    const latest = normalizeArrayResponse<unknown>(response);
    if (latest.length > 0) {
      return latest.map((item) => normalizeSyncRun(item));
    }
    if (response && typeof response === 'object') {
      return [normalizeSyncRun(response)];
    }
    return [];
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
    const response = await apiClient.post<unknown>(API_ENDPOINTS.SYNC_TRIGGER, undefined, {
      params: { mode: request.mode, daysBack: request.daysBack },
    });
    return normalizeSyncRun(response);
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
