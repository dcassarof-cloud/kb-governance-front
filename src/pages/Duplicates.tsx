import { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, Copy, AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { duplicatesService } from '@/services/duplicates.service';
import { DuplicateGroup } from '@/types';
import { toast } from '@/hooks/use-toast';

export default function DuplicatesPage() {
  const [data, setData] = useState<DuplicateGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [primarySelection, setPrimarySelection] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState<{ hash: string; action: string } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await duplicatesService.listGroups();
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

  const handleAction = async (hash: string, action: string, handler: () => Promise<void>) => {
    setActionLoading({ hash, action });
    try {
      await handler();
      toast({ title: 'Ação concluída', description: 'Operação realizada com sucesso.' });
      await fetchData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao executar ação';
      toast({ title: 'Erro', description: message, variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleSetPrimary = async (group: DuplicateGroup) => {
    const hash = group?.hash;
    if (!hash) return;
    const selected = primarySelection[hash];
    if (!selected) {
      toast({ title: 'Atenção', description: 'Selecione o artigo principal antes de salvar.' });
      return;
    }
    await handleAction(hash, 'primary', () => duplicatesService.setPrimary(hash, selected));
  };

  const handleMerge = async (group: DuplicateGroup) => {
    const hash = group?.hash;
    if (!hash) return;
    const selected = primarySelection[hash];
    if (!selected) {
      toast({ title: 'Atenção', description: 'Selecione o artigo principal antes de mesclar.' });
      return;
    }
    await handleAction(hash, 'merge', () => duplicatesService.mergeRequest(hash, selected));
  };

  const handleIgnore = async (group: DuplicateGroup) => {
    const hash = group?.hash;
    if (!hash) return;
    await handleAction(hash, 'ignore', () => duplicatesService.ignoreGroup(hash));
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
          const status = group?.status || 'PENDING';
          const selected = primarySelection[groupHash] || '';
          const isActionLoading = (action: string) =>
            actionLoading?.hash === groupHash && actionLoading?.action === action;

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
                  <StatusBadge status={status} />
                </div>
              </button>
              {expanded === groupHash && (
                <div className="mt-4 pl-8 space-y-4 border-l-2 border-border">
                  {groupArticles.length > 0 ? (
                    <RadioGroup
                      value={selected}
                      onValueChange={(value) =>
                        setPrimarySelection((prev) => ({
                          ...prev,
                          [groupHash]: value,
                        }))
                      }
                      className="space-y-3"
                    >
                      {groupArticles.map((article, articleIndex) => {
                        const articleId = article?.id || `article-${articleIndex}`;
                        return (
                          <div
                            key={articleId}
                            className="flex items-center gap-3 rounded border border-border bg-muted/40 p-3"
                          >
                            <RadioGroupItem value={articleId} id={`${groupHash}-${articleId}`} />
                            <Label htmlFor={`${groupHash}-${articleId}`} className="text-sm">
                              {article?.title || 'Título não disponível'}
                            </Label>
                          </div>
                        );
                      })}
                    </RadioGroup>
                  ) : (
                    <div className="text-sm text-muted-foreground">Nenhum artigo encontrado neste grupo.</div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => handleSetPrimary(group)}
                      disabled={isActionLoading('primary')}
                    >
                      {isActionLoading('primary') ? (
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Salvando...
                        </span>
                      ) : (
                        'Definir principal'
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleMerge(group)}
                      disabled={isActionLoading('merge')}
                    >
                      {isActionLoading('merge') ? (
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Mesclando...
                        </span>
                      ) : (
                        'Mesclar'
                      )}
                    </Button>
                    <Button variant="ghost" onClick={() => handleIgnore(group)} disabled={isActionLoading('ignore')}>
                      {isActionLoading('ignore') ? (
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Ignorando...
                        </span>
                      ) : (
                        'Ignorar'
                      )}
                    </Button>
                  </div>
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
