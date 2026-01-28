import { useEffect, useState } from 'react';
import { AlertTriangle, AlertCircle, RefreshCw } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { governanceService } from '@/services/governance.service';
import { GovernanceIssue, PaginatedResponse } from '@/types';
import { toast } from '@/hooks/use-toast';

export default function GovernancePage() {
  const [data, setData] = useState<PaginatedResponse<GovernanceIssue> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await governanceService.getIssues();
      // Normaliza resposta: garante estrutura esperada
      const normalized: PaginatedResponse<GovernanceIssue> = {
        data: Array.isArray(result?.data) ? result.data : [],
        total: result?.total ?? 0,
        page: result?.page ?? 1,
        size: result?.size ?? 20,
        totalPages: result?.totalPages ?? 0,
      };
      setData(normalized);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar issues';
      setError(message);
      toast({ title: 'Erro', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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

    const issues = data?.data ?? [];

    if (issues.length === 0) {
      return (
        <EmptyState
          icon={AlertTriangle}
          title="Nenhuma issue encontrada"
          description="A base de conhecimento não possui issues de qualidade no momento."
        />
      );
    }

    return (
      <div className="grid gap-4">
        {issues.map((issue, index) => {
          // Guard clauses para campos da issue
          const issueId = issue?.id || `issue-${index}`;
          const severity = issue?.severity || 'LOW';
          const status = issue?.status || 'OPEN';
          const systemCode = issue?.systemCode || '-';
          const articleTitle = issue?.articleTitle || 'Título não disponível';
          const details = issue?.details || 'Sem detalhes';
          const createdAt = formatDate(issue?.createdAt);

          return (
            <div key={issueId} className="card-metric flex items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <StatusBadge status={severity} />
                  <StatusBadge status={status} />
                  <span className="text-xs text-muted-foreground">{systemCode}</span>
                </div>
                <h3 className="font-semibold">{articleTitle}</h3>
                <p className="text-sm text-muted-foreground mt-1">{details}</p>
              </div>
              <span className="text-xs text-muted-foreground">{createdAt}</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <MainLayout>
      <PageHeader title="Governança" description="Issues de qualidade da base de conhecimento" />
      {renderContent()}
    </MainLayout>
  );
}
