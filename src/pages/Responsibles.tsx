import { useMemo, useState } from 'react';
import { AlertCircle, Plus, RefreshCw, UserCheck, AlertTriangle, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { MetricCard } from '@/components/shared/MetricCard';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { ApiErrorBanner } from '@/components/shared/ApiErrorBanner';
import { Button } from '@/components/ui/button';

import { CreateManualAssignmentDialog } from '@/features/governance/components/CreateManualAssignmentDialog';
import { useResponsiblesSummary } from '@/features/governance/hooks/useGovernanceQueries';
import { hasResponsiblesSummaryEndpoint } from '@/services/governance.service';
import { GovernanceResponsible } from '@/types';
import { toast } from '@/hooks/use-toast';
import { governanceTexts } from '@/governanceTexts';
import { formatApiErrorInfo, toApiErrorInfo } from '@/lib/api-error-info';

export default function ResponsiblesPage() {
  const navigate = useNavigate();
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [prefilledAgentId, setPrefilledAgentId] = useState<string>('');

  const summaryQuery = useResponsiblesSummary(hasResponsiblesSummaryEndpoint);
  const summary = summaryQuery.data ?? null;

  const errorMessage = summaryQuery.error
    ? formatApiErrorInfo(toApiErrorInfo(summaryQuery.error, governanceTexts.responsibles.loadError))
    : null;

  const responsibles = summary?.responsibles ?? [];

  const summaryMetrics = useMemo(() => {
    if (!summary) return [];
    return [
      {
        key: 'totalResponsibles',
        title: governanceTexts.responsibles.summary.totalResponsibles,
        value: summary.totalResponsibles ?? responsibles.length,
        icon: Users,
        variant: 'primary' as const,
      },
      {
        key: 'totalOpenIssues',
        title: governanceTexts.responsibles.summary.openPending,
        value: summary.totalOpenIssues ?? null,
        icon: UserCheck,
        variant: 'warning' as const,
      },
      {
        key: 'totalOverdue',
        title: governanceTexts.responsibles.summary.overdue,
        value: summary.totalOverdue ?? null,
        icon: AlertTriangle,
        variant: 'error' as const,
      },
    ].filter((metric) => typeof metric.value === 'number' && Number.isFinite(metric.value));
  }, [summary, responsibles.length]);

  const handleBacklog = (responsible: GovernanceResponsible) => {
    const responsibleId = responsible.id ?? responsible.name;
    navigate(`/governance?responsibleId=${encodeURIComponent(responsibleId)}`);
  };

  return (
    <MainLayout>
      <PageHeader title={governanceTexts.responsibles.title} description={governanceTexts.responsibles.description} />

      {!hasResponsiblesSummaryEndpoint ? (
        <div className="card-metric mb-6">
          <EmptyState
            icon={AlertCircle}
            title="Endpoint ausente"
            description="Backend não expõe endpoint de resumo de responsáveis nesta versão"
          />
        </div>
      ) : summaryQuery.isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {[1, 2, 3].map((item) => (
            <LoadingSkeleton key={item} variant="card" />
          ))}
        </div>
      ) : errorMessage ? (
        <div className="card-metric mb-6">
          <ApiErrorBanner title="Falha ao carregar responsáveis" description={errorMessage} onRetry={() => void summaryQuery.refetch()} />
          <EmptyState
            icon={AlertCircle}
            title={governanceTexts.responsibles.loadError}
            description="Não foi possível carregar os responsáveis."
            action={{
              label: 'Recarregar',
              onClick: () => {
                toast({ title: governanceTexts.general.errorTitle, description: errorMessage, variant: 'destructive' });
                void summaryQuery.refetch();
              },
            }}
          />
        </div>
      ) : summaryMetrics.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {summaryMetrics.map((metric) => (
            <MetricCard key={metric.key} title={metric.title} value={metric.value as number} icon={metric.icon} variant={metric.variant} />
          ))}
        </div>
      ) : null}

      <div className="card-metric">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">{governanceTexts.responsibles.table.title}</h3>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => { setPrefilledAgentId(''); setManualDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              ➕ Solicitar manual
            </Button>
            <Button variant="outline" size="sm" onClick={() => void summaryQuery.refetch()} disabled={!hasResponsiblesSummaryEndpoint}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {governanceTexts.general.update}
            </Button>
          </div>
        </div>

        {!hasResponsiblesSummaryEndpoint ? (
          <EmptyState icon={AlertCircle} title="Endpoint ausente" description="Backend não expõe endpoint de resumo de responsáveis nesta versão" />
        ) : summaryQuery.isLoading ? (
          <LoadingSkeleton variant="table" rows={5} />
        ) : errorMessage ? (
          <>
            <ApiErrorBanner title="Falha ao carregar responsáveis" description={errorMessage} onRetry={() => void summaryQuery.refetch()} />
            <EmptyState icon={AlertCircle} title={governanceTexts.responsibles.loadError} description="Não foi possível carregar os responsáveis." action={{ label: 'Recarregar', onClick: () => void summaryQuery.refetch() }} />
          </>
        ) : responsibles.length === 0 ? (
          <EmptyState icon={Users} title="Nenhum responsável encontrado" description="Nenhum responsável encontrado. Verifique se existem issues com responsável ou se a sincronização de agentes está ativa." action={{ label: 'Recarregar', onClick: () => void summaryQuery.refetch() }} />
        ) : (
          <div className="table-container overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-semibold text-sm">{governanceTexts.responsibles.table.headers.responsible}</th>
                  <th className="text-left p-4 font-semibold text-sm">{governanceTexts.responsibles.table.headers.open}</th>
                  <th className="text-left p-4 font-semibold text-sm">Pendentes</th>
                  <th className="text-left p-4 font-semibold text-sm">{governanceTexts.responsibles.table.headers.overdue}</th>
                  <th className="text-left p-4 font-semibold text-sm">Time</th>
                  <th className="text-left p-4 font-semibold text-sm">{governanceTexts.responsibles.table.headers.averageSla}</th>
                  <th className="text-left p-4 font-semibold text-sm">{governanceTexts.responsibles.table.headers.actions}</th>
                </tr>
              </thead>
              <tbody>
                {responsibles.map((responsible, index) => {
                  const id = responsible.id ?? `${responsible.name}-${index}`;
                  const openIssues = responsible.openIssues ?? 0;
                  const pendingIssues = responsible.pendingIssues ?? responsible.openIssues ?? 0;
                  const overdue = responsible.overdueIssues ?? 0;
                  const teamName = responsible.teamName ?? governanceTexts.general.notAvailable;
                  const sla = responsible.avgSlaDays ?? null;

                  return (
                    <tr key={id} className="border-t border-border hover:bg-muted/30 transition-colors">
                      <td className="p-4 font-medium">
                        <div>{responsible.name}</div>
                        {responsible.email && <div className="text-xs text-muted-foreground">{responsible.email}</div>}
                        {responsible.teamName && <div className="text-xs text-muted-foreground">Time: {responsible.teamName}</div>}
                      </td>
                      <td className="p-4 text-muted-foreground">{openIssues}</td>
                      <td className="p-4 text-muted-foreground">{pendingIssues}</td>
                      <td className="p-4 text-muted-foreground">{overdue}</td>
                      <td className="p-4 text-muted-foreground">{teamName}</td>
                      <td className="p-4 text-muted-foreground">{sla !== null ? governanceTexts.responsibles.table.days(sla) : governanceTexts.general.notAvailable}</td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleBacklog(responsible)}>{governanceTexts.responsibles.table.actions.backlog}</Button>
                          <Button size="sm" variant="secondary" onClick={() => { setPrefilledAgentId(responsible.id ?? ''); setManualDialogOpen(true); }}>Solicitar manual</Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CreateManualAssignmentDialog open={manualDialogOpen} onOpenChange={setManualDialogOpen} prefilledAgentId={prefilledAgentId} onCreated={() => summaryQuery.refetch()} />
    </MainLayout>
  );
}
