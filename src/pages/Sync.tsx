import { useEffect, useState } from 'react';
import { Play, RefreshCw, AlertCircle, Clock } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { syncService } from '@/services/sync.service';
import { SyncRun } from '@/types';
import { toast } from '@/hooks/use-toast';

export default function SyncPage() {
  const [runs, setRuns] = useState<SyncRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await syncService.getSyncRuns();
      // Normaliza resposta: garante que é sempre um array
      const normalized = Array.isArray(result) ? result : [];
      setRuns(normalized);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar histórico de sincronizações';
      setError(message);
      toast({ title: 'Erro', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSync = async () => {
    try {
      toast({ title: 'Sync iniciado', description: 'Executando sincronização manual...' });
      await syncService.triggerSync({ mode: 'INCREMENTAL', note: 'Sync manual' });
      toast({ title: 'Sucesso', description: 'Sincronização concluída com sucesso' });
      // Recarrega a lista após sync
      fetchData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao executar sincronização';
      toast({ title: 'Erro', description: message, variant: 'destructive' });
    }
  };

  // Função segura para formatar data
  const formatDateTime = (dateStr: string | undefined | null): string => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleString('pt-BR');
    } catch {
      return '-';
    }
  };

  // Renderiza conteúdo baseado no estado
  const renderContent = () => {
    if (loading) {
      return <LoadingSkeleton variant="table" rows={4} />;
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

    if (!runs || runs.length === 0) {
      return (
        <EmptyState
          icon={Clock}
          title="Nenhuma sincronização encontrada"
          description="Ainda não há histórico de sincronizações. Execute uma sincronização manual."
        />
      );
    }

    return (
      <div className="table-container overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-4 font-semibold text-sm">Início</th>
              <th className="text-left p-4 font-semibold text-sm">Status</th>
              <th className="text-left p-4 font-semibold text-sm">Modo</th>
              <th className="text-left p-4 font-semibold text-sm">Processados</th>
              <th className="text-left p-4 font-semibold text-sm">Nota</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run, index) => {
              // Guard clauses para campos do run
              const runId = run?.id || `run-${index}`;
              const startedAt = formatDateTime(run?.startedAt);
              const status = run?.status || 'RUNNING';
              const mode = run?.mode || '-';
              const articlesProcessed = run?.stats?.articlesProcessed ?? 0;
              const note = run?.note || '-';

              return (
                <tr key={runId} className="border-t border-border">
                  <td className="p-4 text-sm">{startedAt}</td>
                  <td className="p-4"><StatusBadge status={status} /></td>
                  <td className="p-4 text-sm">{mode}</td>
                  <td className="p-4 text-sm">{articlesProcessed}</td>
                  <td className="p-4 text-sm text-muted-foreground">{note}</td>
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
      <PageHeader
        title="Sincronização"
        description="Histórico de sincronizações com Movidesk"
        actions={
          <Button onClick={handleSync}>
            <Play className="h-4 w-4 mr-2" /> Executar Sync
          </Button>
        }
      />
      {renderContent()}
    </MainLayout>
  );
}
