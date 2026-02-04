// =====================================================
// DUPLICATES SERVICE - Consisa KB Governance
// =====================================================

import { API_ENDPOINTS } from '@/config/app-config';
import { apiClient } from './api-client.service';
import { DuplicateGroup } from '@/types';
import { authService } from './auth.service';

function normalizeArrayResponse<T>(response: unknown): T[] {
  if (Array.isArray(response)) return response;

  if (response && typeof response === 'object') {
    const obj = response as Record<string, unknown>;
    const items = obj.data || obj.items || obj.content || [];
    if (Array.isArray(items)) return items as T[];
  }

  return [];
}

class DuplicatesService {
  async listGroups(): Promise<DuplicateGroup[]> {
    const response = await apiClient.get<unknown>(API_ENDPOINTS.GOVERNANCE_DUPLICATES);
    return normalizeArrayResponse<DuplicateGroup>(response);
  }

  async setPrimary(hash: string, articleId: string): Promise<void> {
    const user = authService.getUser();
    const actor = user?.email ?? user?.id ?? 'system';
    await apiClient.post(API_ENDPOINTS.GOVERNANCE_DUPLICATES_PRIMARY(hash), {
      primaryArticleId: articleId,
      actor,
      // TODO: substituir "system" por usuário real vindo do JWT no Sprint 2.
    });
  }

  async ignore(hash: string, reason: string): Promise<void> {
    await apiClient.post(API_ENDPOINTS.GOVERNANCE_DUPLICATES_IGNORE(hash), { reason });
  }

  async mergeRequest(hash: string, primaryId: string, mergeIds: string[]): Promise<void> {
    await apiClient.post(API_ENDPOINTS.GOVERNANCE_DUPLICATES_MERGE(hash), { primaryId, mergeIds });
  }
}

export const duplicatesService = new DuplicatesService();
