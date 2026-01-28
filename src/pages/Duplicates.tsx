import { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, Copy, AlertCircle, RefreshCw } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { governanceService } from '@/services/governance.service';
import { DuplicateGroup } from '@/types';
import { toast } from '@/hooks/use-toast';

export default function DuplicatesPage() {
  const [data, setData] = useState<DuplicateGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await governanceService.getDuplicates();
      // Normaliza resposta: garante que é sempre um array
      const normalized = Array.isArray(result) ? result : [];
      setData(normalized);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar duplicados';
      setError(message);
      toast({ title: 'Erro', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Função segura para exibir hash truncado
  const formatHash = (hash: string | undefined | null): string => {
    if (!hash || typeof hash !== 'string') return 'N/A';
    return hash.length > 12 ? `${hash.slice(0, 12)}...` : hash;
  };

  // Renderiza conteúdo baseado no estado
  const renderContent = () => {
    if (loading) {
      return <LoadingSkeleton variant="table" rows={3} />;
    }

    if (error) {
      return (
        <div className="card-metric">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h3 className="font-semibold text-lg mb-2">Erro ao carregar dados</h3>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <button
              onClick={fetchData}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              <RefreshCw className="h-4 w-4" />
              Tentar novamente
            </button>
          </div>
        </div>
      );
    }

    if (!data || data.length === 0) {
      return (
        <EmptyState
          icon={Copy}
          title="Nenhum duplicado encontrado"
          description="A base de conhecimento não possui artigos duplicados no momento."
        />
      );
    }

    return (
      <div className="space-y-4">
        {data.map((group, index) => {
          // Guard clauses para campos do grupo
          const groupHash = group?.hash || `group-${index}`;
          const groupCount = group?.count ?? 0;
          const groupArticles = Array.isArray(group?.articles) ? group.articles : [];

          return (
            <div key={groupHash} className="card-metric">
              <button
                className="w-full flex items-center justify-between"
                onClick={() => setExpanded(expanded === groupHash ? null : groupHash)}
              >
                <div className="flex items-center gap-3">
                  {expanded === groupHash ? (
                    <ChevronDown className="h-5 w-5" />
                  ) : (
                    <ChevronRight className="h-5 w-5" />
                  )}
                  <span className="font-semibold">{groupCount} artigos duplicados</span>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                    Hash: {formatHash(group?.hash)}
                  </span>
                </div>
              </button>
              {expanded === groupHash && groupArticles.length > 0 && (
                <div className="mt-4 pl-8 space-y-2 border-l-2 border-border">
                  {groupArticles.map((article, articleIndex) => (
                    <div
                      key={article?.id || `article-${articleIndex}`}
                      className="text-sm p-2 bg-muted/50 rounded"
                    >
                      {article?.title || 'Título não disponível'}
                    </div>
                  ))}
                </div>
              )}
              {expanded === groupHash && groupArticles.length === 0 && (
                <div className="mt-4 pl-8 text-sm text-muted-foreground">
                  Nenhum artigo encontrado neste grupo.
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <MainLayout>
      <PageHeader title="Duplicados" description="Grupos de artigos duplicados identificados" />
      {renderContent()}
    </MainLayout>
  );
}
