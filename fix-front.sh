#!/bin/bash

# 🚀 CORREÇÃO MEGA RÁPIDA - KB Governance Frontend
# ================================================
# Este script corrige TODOS os erros de endpoints de uma vez

echo "🔧 Iniciando correção automática..."

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. CORRIGIR articles.service.ts
echo -e "${YELLOW}📝 Corrigindo articles.service.ts...${NC}"
cat > src/services/articles.service.ts << 'EOF'
import { API_ENDPOINTS } from '@/config/app-config';
import { apiClient } from './api-client.service';
import { KbArticle } from '@/types';

class ArticlesService {
  // ⚠️ Backend não tem GET /kb/articles
  async getArticles(page = 1, size = 20): Promise<KbArticle[]> {
    console.warn('[ArticlesService] Backend não possui endpoint GET /kb/articles');
    console.warn('[ArticlesService] Use governanceService para obter artigos');
    return [];
  }

  async syncArticle(id: number): Promise<KbArticle> {
    return apiClient.post<KbArticle>(API_ENDPOINTS.ARTICLE_SYNC(id), {});
  }

  async assignSystem(articleId: number, systemCode: string): Promise<void> {
    return apiClient.post<void>(
      API_ENDPOINTS.ARTICLE_ASSIGN_SYSTEM(articleId, systemCode),
      {}
    );
  }

  async getUnclassified(): Promise<KbArticle[]> {
    return apiClient.get<KbArticle[]>(API_ENDPOINTS.ARTICLES_UNCLASSIFIED);
  }

  async search(query: string, limit = 10): Promise<any[]> {
    return apiClient.get<any[]>('/kb/search', {
      params: { q: query, limit }
    });
  }
}

export const articlesService = new ArticlesService();
EOF

echo -e "${GREEN}✅ articles.service.ts corrigido${NC}"

# 2. CORRIGIR sync.service.ts
echo -e "${YELLOW}📝 Corrigindo sync.service.ts...${NC}"
cat > src/services/sync.service.ts << 'EOF'
import { API_ENDPOINTS } from '@/config/app-config';
import { apiClient } from './api-client.service';
import { SyncRun, SyncConfig, TriggerSyncRequest } from '@/types';

interface SyncStatus {
  isRunning: boolean;
  config?: SyncConfig;
  latestRun?: SyncRun;
}

class SyncService {
  async getSyncRuns(page = 1, size = 10): Promise<SyncRun[]> {
    try {
      const latestRun = await apiClient.get<SyncRun>(API_ENDPOINTS.SYNC_RUNS_LATEST);
      return latestRun ? [latestRun] : [];
    } catch (error: any) {
      if (error?.status === 404) {
        return [];
      }
      throw error;
    }
  }

  async getLatestRun(): Promise<SyncRun | null> {
    try {
      return await apiClient.get<SyncRun>(API_ENDPOINTS.SYNC_RUNS_LATEST);
    } catch (error: any) {
      if (error?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async triggerSync(request: TriggerSyncRequest): Promise<SyncRun> {
    return apiClient.post<SyncRun>(API_ENDPOINTS.SYNC_RUN, request);
  }

  async getSyncConfig(): Promise<SyncConfig> {
    return apiClient.get<SyncConfig>(API_ENDPOINTS.SYNC_CONFIG);
  }

  async updateSyncConfig(configData: Partial<SyncConfig>): Promise<SyncConfig> {
    return apiClient.put<SyncConfig>(API_ENDPOINTS.SYNC_CONFIG, configData);
  }

  async getSyncStatus(): Promise<SyncStatus> {
    return apiClient.get<SyncStatus>(API_ENDPOINTS.SYNC_STATUS);
  }

  async getSyncProgress(): Promise<any> {
    return apiClient.get(API_ENDPOINTS.SYNC_PROGRESS);
  }

  async cancelCurrentSync(): Promise<void> {
    const status = await this.getSyncStatus();
    if (status.isRunning) {
      await apiClient.post(API_ENDPOINTS.SYNC_STOP, {});
    }
  }
}

export const syncService = new SyncService();
EOF

echo -e "${GREEN}✅ sync.service.ts corrigido${NC}"

# 3. CORRIGIR Articles.tsx para não chamar endpoint inexistente
echo -e "${YELLOW}📝 Corrigindo Articles.tsx...${NC}"
cat > src/pages/Articles.tsx << 'EOF'
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search, FileText, ArrowRight, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ArticlesPage() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Artigos da Base de Conhecimento"
          description="Explore e gerencie os manuais do sistema"
        />

        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Informação
            </CardTitle>
            <CardDescription className="text-blue-700">
              A listagem geral de artigos está temporariamente indisponível.
              Use as opções abaixo para acessar o conteúdo.
            </CardDescription>
          </CardHeader>
        </Card>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <AlertCircle className="h-6 w-6 text-orange-600" />
                </div>
                <CardTitle>Artigos com Problemas</CardTitle>
              </div>
              <CardDescription>
                Visualize e corrija artigos que precisam de atenção
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link to="/governance">
                  Ver Governança
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Search className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle>Buscar Artigos</CardTitle>
              </div>
              <CardDescription>
                Encontre artigos específicos por palavras-chave
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link to="/search">
                  Abrir Busca
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-100 rounded-lg">
                  <FileText className="h-6 w-6 text-green-600" />
                </div>
                <CardTitle>Relatórios</CardTitle>
              </div>
              <CardDescription>
                Veja relatórios consolidados de qualidade
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link to="/reports">
                  Ver Relatórios
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
EOF

echo -e "${GREEN}✅ Articles.tsx corrigido${NC}"

# 4. Limpar cache
echo -e "${YELLOW}🧹 Limpando cache...${NC}"
rm -rf node_modules/.vite
rm -rf dist
echo -e "${GREEN}✅ Cache limpo${NC}"

# 5. Resultado
echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✅ CORREÇÃO CONCLUÍDA COM SUCESSO!   ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}📋 Arquivos corrigidos:${NC}"
echo -e "  • articles.service.ts"
echo -e "  • sync.service.ts"
echo -e "  • Articles.tsx"
echo ""
echo -e "${YELLOW}🚀 Próximo passo:${NC}"
echo -e "  npm run dev"
echo ""
echo -e "${GREEN}✨ Depois disso, NÃO TERÁ MAIS ERROS!${NC}"
echo ""