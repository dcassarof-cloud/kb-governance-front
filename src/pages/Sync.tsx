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
import { governanceTexts } from '@/governanceTexts';

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
      const message = err instanceof Error ? err.message : governanceTexts.sync.loadError;
      setError(message);
      toast({ title: governanceTexts.general.errorTitle, description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSync = async () => {
    try {
      toast({ title: governanceTexts.sync.runStartedTitle, description: governanceTexts.sync.runStartedDescription });
      await syncService.triggerSync({ mode: 'INCREMENTAL' });
      toast({ title: governanceTexts.sync.runSuccessTitle, description: governanceTexts.sync.runSuccessDescription });
      // Recarrega a lista após sync
      fetchData();
    } catch (err) {
      const message = err instanceof Error ? err.message : governanceTexts.sync.runError;
      toast({ title: governanceTexts.general.errorTitle, description: message, variant: 'destructive' });
    }
  };

  // Função segura para formatar data
  const formatDateTime = (dateStr: string | undefined | null): string => {
    if (!dateStr) return governanceTexts.general.notAvailable;
    try {
      return new Date(dateStr).toLocaleString('pt-BR');
    } catch {
      return governanceTexts.general.notAvailable;
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
            <h3 className="font-semibold text-lg mb-2">{governanceTexts.sync.loadError}</h3>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <button
              onClick={fetchData}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              <RefreshCw className="h-4 w-4" />
              {governanceTexts.general.retry}
            </button>
          </div>
        </div>
      );
    }

    if (!runs || runs.length === 0) {
      return (
        <EmptyState
          icon={Clock}
          title={governanceTexts.sync.emptyTitle}
          description={governanceTexts.sync.emptyDescription}
        />
      );
    }

    return (
      <div className="table-container overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-4 font-semibold text-sm">{governanceTexts.sync.table.startedAt}</th>
              <th className="text-left p-4 font-semibold text-sm">{governanceTexts.sync.table.status}</th>
              <th className="text-left p-4 font-semibold text-sm">{governanceTexts.sync.table.mode}</th>
              <th className="text-left p-4 font-semibold text-sm">{governanceTexts.sync.table.processed}</th>
              <th className="text-left p-4 font-semibold text-sm">{governanceTexts.sync.table.note}</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run, index) => {
              // Guard clauses para campos do run
              const runId = run?.id || `run-${index}`;
              const startedAt = formatDateTime(run?.startedAt);
              const status = run?.status || 'RUNNING';
              const normalizedMode = run?.mode === 'DELTA_WINDOW' ? 'DELTA' : run?.mode;
              const modeLabel = normalizedMode
                ? governanceTexts.settings.modeOptions[normalizedMode as keyof typeof governanceTexts.settings.modeOptions] ?? normalizedMode
                : governanceTexts.general.notAvailable;
              const stats = run?.stats;
              const statsSummary = stats
                ? [
                    typeof stats.articlesProcessed === 'number' ? `Proc: ${stats.articlesProcessed}` : null,
                    typeof stats.articlesCreated === 'number' ? `Criados: ${stats.articlesCreated}` : null,
                    typeof stats.articlesUpdated === 'number' ? `Atualizados: ${stats.articlesUpdated}` : null,
                    typeof stats.errors === 'number' ? `Erros: ${stats.errors}` : null,
                  ].filter(Boolean).join(' • ')
                : '';
              const note = run?.note || governanceTexts.sync.noteFallback;

              return (
                <tr key={runId} className="border-t border-border">
                  <td className="p-4 text-sm">{startedAt}</td>
                  <td className="p-4"><StatusBadge status={status} /></td>
                  <td className="p-4 text-sm">{modeLabel}</td>
                  <td className="p-4 text-sm">{statsSummary || governanceTexts.general.notAvailable}</td>
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
        title={governanceTexts.sync.title}
        description={governanceTexts.sync.description}
        actions={
          <Button onClick={handleSync}>
            <Play className="h-4 w-4 mr-2" /> {governanceTexts.sync.runAction}
          </Button>
        }
      />
      {renderContent()}
    </MainLayout>
  );
}
