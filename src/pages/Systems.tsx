import { useEffect, useState } from 'react';
import { Server, AlertCircle, RefreshCw } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Progress } from '@/components/ui/progress';
import { systemsService } from '@/services/systems.service';
import { KbSystem } from '@/types';
import { toast } from '@/hooks/use-toast';

export default function SystemsPage() {
  const [data, setData] = useState<KbSystem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await systemsService.getSystems();
      // Normaliza resposta: garante que é sempre um array
      const normalized = Array.isArray(result) ? result : [];
      setData(normalized);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar sistemas';
      setError(message);
      toast({ title: 'Erro', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
          icon={Server}
          title="Nenhum sistema encontrado"
          description="Não há sistemas conectados à base de conhecimento."
        />
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.map((system, index) => {
          // Guard clauses para campos do sistema
          const systemId = system?.id || `system-${index}`;
          const name = system?.name || 'Sistema sem nome';
          const isActive = system?.isActive ?? false;
          const articlesCount = system?.articlesCount ?? 0;
          const qualityScore = system?.qualityScore ?? 0;

          return (
            <div key={systemId} className="card-metric">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">{name}</h3>
                <StatusBadge status={isActive ? 'OK' : 'ERROR'} />
              </div>
              <p className="text-sm text-muted-foreground mb-2">{articlesCount} manuais</p>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Qualidade</span>
                  <span className="font-semibold">{qualityScore}%</span>
                </div>
                <Progress value={qualityScore} className="h-2" />
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <MainLayout>
      <PageHeader title="Sistemas" description="Sistemas conectados à base de conhecimento" />
      {renderContent()}
    </MainLayout>
  );
}
