import { useEffect, useState } from 'react';
import { ExternalLink, Search, AlertCircle, RefreshCw } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { articlesService } from '@/services/articles.service';
import { KbArticle, PaginatedResponse } from '@/types';
import { toast } from '@/hooks/use-toast';

export default function ArticlesPage() {
  const [data, setData] = useState<PaginatedResponse<KbArticle> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const fetchData = async (searchTerm: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await articlesService.getArticles({ q: searchTerm });
      // Normaliza resposta
      const normalized: PaginatedResponse<KbArticle> = {
        data: Array.isArray(result?.data) ? result.data : [],
        total: result?.total ?? 0,
        page: result?.page ?? 1,
        size: result?.size ?? 20,
        totalPages: result?.totalPages ?? 0,
      };
      setData(normalized);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar manuais';
      setError(message);
      toast({ title: 'Erro', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(search);
  }, [search]);

  // Função segura para formatar data
  const formatDate = (dateStr: string | undefined | null): string => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR');
    } catch {
      return '-';
    }
  };

  // Renderiza conteúdo baseado no estado
  const renderContent = () => {
    if (loading) {
      return <LoadingSkeleton variant="table" rows={5} />;
    }

    if (error) {
      return (
        <div className="card-metric">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h3 className="font-semibold text-lg mb-2">Erro ao carregar dados</h3>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <button
              onClick={() => fetchData(search)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              <RefreshCw className="h-4 w-4" />
              Tentar novamente
            </button>
          </div>
        </div>
      );
    }

    const articles = data?.data ?? [];

    if (articles.length === 0) {
      return <EmptyState title="Nenhum manual encontrado" description="Tente ajustar os filtros de busca" />;
    }

    return (
      <div className="table-container overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-4 font-semibold text-sm">Título</th>
              <th className="text-left p-4 font-semibold text-sm">Sistema</th>
              <th className="text-left p-4 font-semibold text-sm">Status</th>
              <th className="text-left p-4 font-semibold text-sm">Atualizado</th>
              <th className="text-left p-4 font-semibold text-sm">Ações</th>
            </tr>
          </thead>
          <tbody>
            {articles.map((article, index) => {
              // Guard clauses para campos do artigo
              const articleId = article?.id || `article-${index}`;
              const title = article?.title || 'Título não disponível';
              const systemCode = article?.systemCode || '-';
              const governanceStatus = article?.governanceStatus || 'PENDING';
              const updatedDate = formatDate(article?.updatedDate);
              const manualLink = article?.manualLink || '#';

              return (
                <tr key={articleId} className="border-t border-border hover:bg-muted/30 transition-colors">
                  <td className="p-4 font-medium">{title}</td>
                  <td className="p-4 text-muted-foreground">{systemCode}</td>
                  <td className="p-4"><StatusBadge status={governanceStatus} /></td>
                  <td className="p-4 text-muted-foreground text-sm">{updatedDate}</td>
                  <td className="p-4">
                    <Button variant="ghost" size="sm" asChild>
                      <a href={manualLink} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <MainLayout>
      <PageHeader title="Manuais" description="Gerencie os artigos da base de conhecimento" />

      <div className="flex gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar manuais..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {renderContent()}
    </MainLayout>
  );
}
