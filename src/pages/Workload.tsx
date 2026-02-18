import { useMemo, useState } from 'react';
import { AlertCircle, Plus, RefreshCw, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { ApiErrorBanner } from '@/components/shared/ApiErrorBanner';
import { Button } from '@/components/ui/button';

import { governanceService, hasResponsiblesSummaryEndpoint } from '@/services/governance.service';
import { CreateManualAssignmentDialog } from '@/features/governance/components/CreateManualAssignmentDialog';
import { GovernanceIssueDto } from '@/types';
import { governanceTexts } from '@/governanceTexts';
import { formatApiErrorInfo, toApiErrorInfo } from '@/lib/api-error-info';
import { useResponsiblesSummary } from '@/features/governance/hooks/useGovernanceQueries';

const resolveResponsibleKey = (issue: GovernanceIssueDto) =>
  issue.assignedAgentName || issue.responsibleName || issue.responsible || issue.assignedAgentId || issue.responsibleId || '';

export default function WorkloadPage() {
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [prefilledAgentId, setPrefilledAgentId] = useState<string>('');

  const summaryQuery = useResponsiblesSummary(hasResponsiblesSummaryEndpoint);
  const issuesQuery = useQuery({
    queryKey: ['workload-issues'],
    queryFn: () => governanceService.listIssues({ page: 1, size: 200, responsibleType: 'AGENT' }),
    enabled: hasResponsiblesSummaryEndpoint,
    retry: false,
  });

  const summary = summaryQuery.data ?? null;
  const issues = issuesQuery.data?.data ?? [];
  const isLoading = summaryQuery.isLoading || issuesQuery.isLoading;
  const errorMessage = summaryQuery.error || issuesQuery.error
    ? formatApiErrorInfo(toApiErrorInfo(summaryQuery.error ?? issuesQuery.error, governanceTexts.workload.loadError))
    : null;

  const systemsByResponsible = useMemo(() => {
    const map = new Map<string, Set<string>>();
    issues.forEach((issue) => {
      const key = resolveResponsibleKey(issue);
      if (!key) return;
      const system = issue.systemName || issue.systemCode;
      if (!system) return;
      if (!map.has(key)) map.set(key, new Set());
      map.get(key)?.add(system);
    });
    return map;
  }, [issues]);

  const responsibles = summary?.responsibles ?? [];

  const renderSystems = (responsibleNameOrId: string) => {
    const systems = Array.from(systemsByResponsible.get(responsibleNameOrId) ?? []);
    if (systems.length === 0) return governanceTexts.general.notAvailable;
    if (systems.length <= 3) return systems.join(', ');
    return `${systems.slice(0, 3).join(', ')} +${systems.length - 3}`;
  };

  return (
    <MainLayout>
      <PageHeader title={governanceTexts.workload.title} description={governanceTexts.workload.description} />

      <div className="card-metric">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">{governanceTexts.workload.title}</h3>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => { setPrefilledAgentId(''); setManualDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              ➕ Solicitar manual
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void summaryQuery.refetch();
                void issuesQuery.refetch();
              }}
              disabled={!hasResponsiblesSummaryEndpoint}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {governanceTexts.general.update}
            </Button>
          </div>
        </div>

        {!hasResponsiblesSummaryEndpoint ? (
          <EmptyState
            icon={AlertCircle}
            title="Endpoint ausente"
            description="Backend não expõe endpoint de resumo de responsáveis nesta versão"
          />
        ) : isLoading ? (
          <LoadingSkeleton variant="table" rows={5} />
        ) : errorMessage ? (
          <>
            <ApiErrorBanner title="Falha ao carregar carga do time" description={errorMessage} onRetry={() => { void summaryQuery.refetch(); void issuesQuery.refetch(); }} />
            <EmptyState icon={AlertCircle} title={governanceTexts.workload.loadError} description="Não foi possível carregar os dados de carga." action={{ label: 'Recarregar', onClick: () => { void summaryQuery.refetch(); void issuesQuery.refetch(); } }} />
          </>
        ) : responsibles.length === 0 ? (
          <EmptyState icon={Users} title="Nenhum responsável encontrado" description="Nenhum responsável encontrado. Verifique se existem issues com responsável ou se a sincronização de agentes está ativa." action={{ label: 'Recarregar', onClick: () => { void summaryQuery.refetch(); void issuesQuery.refetch(); } }} />
        ) : (
          <div className="table-container overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-semibold text-sm">{governanceTexts.workload.table.headers.responsible}</th>
                  <th className="text-left p-4 font-semibold text-sm">{governanceTexts.workload.table.headers.open}</th>
                  <th className="text-left p-4 font-semibold text-sm">Pendentes</th>
                  <th className="text-left p-4 font-semibold text-sm">{governanceTexts.workload.table.headers.overdue}</th>
                  <th className="text-left p-4 font-semibold text-sm">Time</th>
                  <th className="text-left p-4 font-semibold text-sm">{governanceTexts.workload.table.headers.systems}</th>
                </tr>
              </thead>
              <tbody>
                {responsibles.map((responsible, index) => {
                  const key = responsible.id ?? `${responsible.name}-${index}`;
                  const lookupKey = responsible.id ?? responsible.name;
                  const openIssues = responsible.openIssues ?? 0;
                  const pendingIssues = responsible.pendingIssues ?? responsible.openIssues ?? 0;
                  const overdue = responsible.overdueIssues ?? 0;
                  const teamName = responsible.teamName ?? governanceTexts.general.notAvailable;

                  return (
                    <tr key={key} className="border-t border-border hover:bg-muted/30 transition-colors" onClick={() => setPrefilledAgentId(responsible.id ?? '')}>
                      <td className="p-4 font-medium">
                        <div>{responsible.name}</div>
                        {responsible.email && <div className="text-xs text-muted-foreground">{responsible.email}</div>}
                        {responsible.teamName && <div className="text-xs text-muted-foreground">Time: {responsible.teamName}</div>}
                      </td>
                      <td className="p-4 text-muted-foreground">{openIssues}</td>
                      <td className="p-4 text-muted-foreground">{pendingIssues}</td>
                      <td className="p-4 text-muted-foreground">{overdue}</td>
                      <td className="p-4 text-muted-foreground">{teamName}</td>
                      <td className="p-4 text-muted-foreground">{renderSystems(lookupKey)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CreateManualAssignmentDialog
        open={manualDialogOpen}
        onOpenChange={setManualDialogOpen}
        prefilledAgentId={prefilledAgentId}
        onCreated={() => {
          void summaryQuery.refetch();
          void issuesQuery.refetch();
        }}
      />
    </MainLayout>
  );
}
