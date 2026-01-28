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

// Helper: Normaliza resposta paginada (suporta items, content, data, ou array direto)
function normalizePaginatedResponse<T>(response: unknown, page: number, size: number): PaginatedResponse<T> {
  // Se é um array direto
  if (Array.isArray(response)) {
    return {
      data: response,
      total: response.length,
      page,
      size,
      totalPages: Math.ceil(response.length / size) || 1,
    };
  }

  // Se é um objeto
  if (response && typeof response === 'object') {
    const obj = response as Record<string, unknown>;

    // Tenta extrair dados de diferentes formatos de API
    const items = obj.data || obj.items || obj.content || [];
    const dataArray = Array.isArray(items) ? items : [];

    return {
      data: dataArray as T[],
      total: (obj.total as number) ?? (obj.totalElements as number) ?? dataArray.length,
      page: (obj.page as number) ?? page,
      size: (obj.size as number) ?? size,
      totalPages: (obj.totalPages as number) ?? (Math.ceil(dataArray.length / size) || 1),
    };
  }

  // Fallback: retorna estrutura vazia
  return {
    data: [],
    total: 0,
    page,
    size,
    totalPages: 0,
  };
}

class ArticlesService {
  async getArticles(filter: ArticlesFilter = {}): Promise<PaginatedResponse<KbArticle>> {
    const { page = 1, size = config.defaultPageSize, q, systemCode, status } = filter;

    if (config.useMockData) {
      await new Promise(resolve => setTimeout(resolve, 400));

      let filtered = Array.isArray(mockArticles) ? [...mockArticles] : [];

      if (q) {
        const query = q.toLowerCase();
        filtered = filtered.filter(a =>
          a?.title?.toLowerCase().includes(query) ||
          a?.systemCode?.toLowerCase().includes(query) ||
          a?.systemName?.toLowerCase().includes(query)
        );
      }

      if (systemCode) {
        filtered = filtered.filter(a => a?.systemCode === systemCode);
      }

      if (status) {
        filtered = filtered.filter(a => a?.governanceStatus === status);
      }

      const total = filtered.length;
      const start = (page - 1) * size;
      const data = filtered.slice(start, start + size);

      return {
        data,
        total,
        page,
        size,
        totalPages: Math.ceil(total / size) || 1,
      };
    }

    // Chamada à API real com normalização de resposta
    const response = await apiClient.get<unknown>(API_ENDPOINTS.ARTICLES, {
      params: { page, size, q, systemCode, status },
    });

    return normalizePaginatedResponse<KbArticle>(response, page, size);
  }

  async getArticleById(id: string): Promise<KbArticle | null> {
    if (config.useMockData) {
      await new Promise(resolve => setTimeout(resolve, 300));
      const articles = Array.isArray(mockArticles) ? mockArticles : [];
      return articles.find(a => a?.id === id) || null;
    }

    // Chamada à API real
    try {
      const response = await apiClient.get<KbArticle>(API_ENDPOINTS.ARTICLE_BY_ID(id));
      return response || null;
    } catch {
      return null;
    }
  }
}

export const articlesService = new ArticlesService();
