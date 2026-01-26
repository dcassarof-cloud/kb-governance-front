import { useEffect, useState } from 'react';
import { Play, RefreshCw } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { Button } from '@/components/ui/button';
import { syncService } from '@/services/sync.service';
import { SyncRun } from '@/types';
import { toast } from '@/hooks/use-toast';

export default function SyncPage() {
  const [runs, setRuns] = useState<SyncRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    syncService.getSyncRuns().then((result) => { setRuns(result); setLoading(false); });
  }, []);

  const handleSync = async () => {
    toast({ title: 'Sync iniciado', description: 'Executando sincronização manual...' });
    await syncService.triggerSync({ mode: 'INCREMENTAL', note: 'Sync manual' });
  };

  return (
    <MainLayout>
      <PageHeader title="Sincronização" description="Histórico de sincronizações com Movidesk" actions={
        <Button onClick={handleSync}><Play className="h-4 w-4 mr-2" /> Executar Sync</Button>
      } />
      {loading ? <LoadingSkeleton variant="table" rows={4} /> : (
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
              {runs.map((run) => (
                <tr key={run.id} className="border-t border-border">
                  <td className="p-4 text-sm">{new Date(run.startedAt).toLocaleString('pt-BR')}</td>
                  <td className="p-4"><StatusBadge status={run.status} /></td>
                  <td className="p-4 text-sm">{run.mode}</td>
                  <td className="p-4 text-sm">{run.stats.articlesProcessed}</td>
                  <td className="p-4 text-sm text-muted-foreground">{run.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </MainLayout>
  );
}
