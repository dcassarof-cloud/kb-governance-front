import { useEffect, useState } from 'react';
import { AlertTriangle, AlertCircle, RefreshCw, Clock } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { governanceService } from '@/services/governance.service';
import { GovernanceIssue, PaginatedResponse } from '@/types';
import { toast } from '@/hooks/use-toast';

// Mapeamento de tipos de issue para labels legíveis
const ISSUE_TYPE_LABELS: Record<string, string> = {
  MISSING_CONTENT: 'Conteúdo Ausente',
  BROKEN_LINK: 'Link Quebrado',
  OUTDATED: 'Desatualizado',
  DUPLICATE: 'Duplicado',
  FORMAT_ERROR: 'Erro de Formato',
};

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

  // Calcula idade em dias a partir da data de criação
  const calculateAgeDays = (dateStr: string | undefined | null): number => {
    if (!dateStr) return 0;
    try {
      const created = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - created.getTime();
      return Math.floor(diffMs / (1000 * 60 * 60 * 24));
    } catch {
      return 0;
    }
  };

  // Formata a idade para exibição
  const formatAge = (days: number): string => {
    if (days === 0) return 'Hoje';
    if (days === 1) return '1 dia';
    if (days < 7) return `${days} dias`;
    if (days < 30) {
      const weeks = Math.floor(days / 7);
      return weeks === 1 ? '1 semana' : `${weeks} semanas`;
    }
    const months = Math.floor(days / 30);
    return months === 1 ? '1 mês' : `${months} meses`;
  };

  // Ordena issues por mais antigas primeiro (default)
  const sortByOldest = (issues: GovernanceIssue[]): GovernanceIssue[] => {
    return [...issues].sort((a, b) => {
      const dateA = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateA - dateB; // Mais antigas primeiro
    });
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

    const rawIssues = data?.data ?? [];

    if (rawIssues.length === 0) {
      return (
        <EmptyState
          icon={AlertTriangle}
          title="Nenhuma issue encontrada"
          description="A base de conhecimento não possui issues de qualidade no momento."
        />
      );
    }

    // Ordena por mais antigas primeiro
    const issues = sortByOldest(rawIssues);

    return (
      <div className="space-y-4">
        {/* Header com contagem */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {issues.length} issue{issues.length !== 1 ? 's' : ''} encontrada{issues.length !== 1 ? 's' : ''}
            {' '}<span className="text-xs">(ordenadas por mais antigas)</span>
          </p>
        </div>

        {/* Lista de issues */}
        <div className="grid gap-4">
          {issues.map((issue, index) => {
            // Guard clauses para campos da issue
            const issueId = issue?.id || `issue-${index}`;
            const issueType = issue?.type || 'UNKNOWN';
            const severity = issue?.severity || 'LOW';
            const status = issue?.status || 'OPEN';
            const systemCode = issue?.systemCode || '-';
            const articleTitle = issue?.articleTitle || 'Título não disponível';
            const details = issue?.details || 'Sem detalhes';
            const ageDays = calculateAgeDays(issue?.createdAt);
            const ageText = formatAge(ageDays);
            const typeLabel = ISSUE_TYPE_LABELS[issueType] || issueType;

            // Determina cor do indicador de idade
            const ageColorClass = ageDays > 30
              ? 'text-destructive'
              : ageDays > 7
                ? 'text-warning'
                : 'text-muted-foreground';

            return (
              <div key={issueId} className="card-metric">
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    {/* Linha 1: Badges de tipo, severidade e status */}
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-xs font-medium bg-muted px-2 py-1 rounded">
                        {typeLabel}
                      </span>
                      <StatusBadge status={severity} />
                      <StatusBadge status={status} />
                      <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">
                        {systemCode}
                      </span>
                    </div>

                    {/* Linha 2: Título do artigo */}
                    <h3 className="font-semibold">{articleTitle}</h3>

                    {/* Linha 3: Detalhes */}
                    <p className="text-sm text-muted-foreground mt-1">{details}</p>
                  </div>

                  {/* Coluna direita: Idade */}
                  <div className={`flex flex-col items-end text-right ${ageColorClass}`}>
                    <Clock className="h-4 w-4 mb-1" />
                    <span className="text-xs font-medium">{ageText}</span>
                    {ageDays > 0 && (
                      <span className="text-xs opacity-70">em aberto</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
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
