// =====================================================
// ARTICLES SERVICE - Consisa KB Governance
// =====================================================

import { config, API_ENDPOINTS } from '@/config/app-config';
import { apiClient } from './api-client.service';
import { KbArticle, PaginatedResponse, GovernanceStatus } from '@/types';
import { mockArticles } from '@/data/mock-data';

export interface ArticlesFilter {
  page?: number;
  size?: number;
  q?: string;
  systemCode?: string;
  status?: GovernanceStatus;
}

class ArticlesService {
  async getArticles(filter: ArticlesFilter = {}): Promise<PaginatedResponse<KbArticle>> {
    const { page = 1, size = config.defaultPageSize, q, systemCode, status } = filter;

    if (config.useMockData) {
      await new Promise(resolve => setTimeout(resolve, 400));

      let filtered = [...mockArticles];

      if (q) {
        const query = q.toLowerCase();
        filtered = filtered.filter(a => 
          a.title.toLowerCase().includes(query) ||
          a.systemCode.toLowerCase().includes(query) ||
          a.systemName.toLowerCase().includes(query)
        );
      }

      if (systemCode) {
        filtered = filtered.filter(a => a.systemCode === systemCode);
      }

      if (status) {
        filtered = filtered.filter(a => a.governanceStatus === status);
      }

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
    return apiClient.get<PaginatedResponse<KbArticle>>(API_ENDPOINTS.ARTICLES, {
      params: { page, size, q, systemCode, status },
    });
  }

  async getArticleById(id: string): Promise<KbArticle | null> {
    if (config.useMockData) {
      await new Promise(resolve => setTimeout(resolve, 300));
      return mockArticles.find(a => a.id === id) || null;
    }

    // TODO: Habilitar quando API estiver disponível
    return apiClient.get<KbArticle>(API_ENDPOINTS.ARTICLE_BY_ID(id));
  }
}

export const articlesService = new ArticlesService();
