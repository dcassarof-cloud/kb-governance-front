import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Plus, RefreshCw, Users } from 'lucide-react';

import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { ApiErrorBanner } from '@/components/shared/ApiErrorBanner';
import { Button } from '@/components/ui/button';

import { governanceService } from '@/services/governance.service';
import { CreateManualAssignmentDialog } from '@/features/governance/components/CreateManualAssignmentDialog';
import { GovernanceIssueDto, GovernanceResponsible, GovernanceResponsiblesSummary } from '@/types';
import { toast } from '@/hooks/use-toast';
import { governanceTexts } from '@/governanceTexts';
import { formatApiErrorInfo, toApiErrorInfo } from '@/lib/api-error-info';

const isIssueOpen = (issue: GovernanceIssueDto) => issue.status !== 'RESOLVED' && issue.status !== 'IGNORED';

const isIssueOverdue = (issue: GovernanceIssueDto) => {
  if (!isIssueOpen(issue)) return false;
  const dueDateValue = issue.slaDueAt ?? issue.dueDate;
  if (!dueDateValue) return false;
  const dueDate = new Date(dueDateValue);
  if (Number.isNaN(dueDate.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);
  return dueDate < today;
};

const resolveResponsibleKey = (issue: GovernanceIssueDto) =>
  issue.assignedAgentName || issue.responsibleName || issue.responsible || issue.assignedAgentId || issue.responsibleId || '';

const normalizeWorkloadResponse = (raw: unknown): GovernanceResponsible[] => {
  if (Array.isArray(raw)) return raw as GovernanceResponsible[];
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    const list = obj.data ?? obj.items ?? obj.content ?? [];
    return Array.isArray(list) ? (list as GovernanceResponsible[]) : [];
  }
  return [];
};

export default function WorkloadPage() {
  const [summary, setSummary] = useState<GovernanceResponsiblesSummary | null>(null);
  const [issues, setIssues] = useState<GovernanceIssueDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [prefilledAgentId, setPrefilledAgentId] = useState<string>('');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryResult, issuesResult] = await Promise.allSettled([
        governanceService.getResponsiblesSummary(),
        governanceService.listIssues({ page: 1, size: 200 }),
      ]);

      if (summaryResult.status === 'fulfilled') {
        setSummary({
          ...summaryResult.value,
          responsibles: normalizeWorkloadResponse(summaryResult.value.responsibles),
        });
      }

      if (issuesResult.status === 'fulfilled') {
        setIssues(issuesResult.value?.data ?? []);
      }

      if (summaryResult.status === 'rejected' && issuesResult.status === 'rejected') {
        throw summaryResult.reason ?? issuesResult.reason;
      }
    } catch (err) {
      const info = toApiErrorInfo(err, governanceTexts.workload.loadError);
      const message = formatApiErrorInfo(info);
      setError(message);
      toast({ title: governanceTexts.general.errorTitle, description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const systemsByResponsible = useMemo(() => {
    const map = new Map<string, Set<string>>();
    issues.forEach((issue) => {
      const key = resolveResponsibleKey(issue);
      if (!key) return;
      const system = issue.systemName || issue.systemCode;
      if (!system) return;
      if (!map.has(key)) {
        map.set(key, new Set());
      }
      map.get(key)?.add(system);
    });
    return map;
  }, [issues]);

  const responsibles = useMemo(() => {
    const list = summary?.responsibles ?? [];
    if (list.length > 0) return list;

    const fallbackMap = new Map<string, GovernanceResponsible>();
    issues.forEach((issue) => {
      const key = resolveResponsibleKey(issue);
      if (!key) return;
      const current = fallbackMap.get(key) ?? { name: key };
      if (isIssueOpen(issue)) {
        current.openIssues = (current.openIssues ?? 0) + 1;
      }
      if (isIssueOverdue(issue)) {
        current.overdueIssues = (current.overdueIssues ?? 0) + 1;
      }
      fallbackMap.set(key, current);
    });
    return Array.from(fallbackMap.values());
  }, [issues, summary]);

  const renderSystems = (responsible: GovernanceResponsible) => {
    const key = responsible.id ?? responsible.name;
    const systems = Array.from(systemsByResponsible.get(key) ?? []);
    if (systems.length === 0) return governanceTexts.general.notAvailable;
    if (systems.length <= 3) return systems.join(', ');
    const visible = systems.slice(0, 3).join(', ');
    return `${visible} +${systems.length - 3}`;
  };

  return (
    <MainLayout>
      <PageHeader title={governanceTexts.workload.title} description={governanceTexts.workload.description} />

      <div className="card-metric">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">{governanceTexts.workload.title}</h3>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => {
                setPrefilledAgentId('');
                setManualDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              ➕ Solicitar manual
            </Button>
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {governanceTexts.general.update}
            </Button>
          </div>
        </div>

        {loading ? (
          <LoadingSkeleton variant="table" rows={5} />
        ) : error ? (
          <>
            <ApiErrorBanner
              title="Falha ao carregar carga do time"
              description={error}
              onRetry={fetchData}
            />
            <EmptyState
              icon={AlertCircle}
              title={governanceTexts.workload.loadError}
              description="Não foi possível carregar os dados de carga."
              action={{ label: 'Recarregar', onClick: fetchData }}
            />
          </>
        ) : responsibles.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Nenhum responsável encontrado"
            description="Nenhuma pendência atribuída ainda. Atribua responsáveis na fila de pendências."
            action={{ label: 'Recarregar', onClick: fetchData }}
          />
        ) : (
          <div className="table-container overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-semibold text-sm">{governanceTexts.workload.table.headers.responsible}</th>
                  <th className="text-left p-4 font-semibold text-sm">{governanceTexts.workload.table.headers.open}</th>
                  <th className="text-left p-4 font-semibold text-sm">{governanceTexts.workload.table.headers.overdue}</th>
                  <th className="text-left p-4 font-semibold text-sm">{governanceTexts.workload.table.headers.systems}</th>
                </tr>
              </thead>
              <tbody>
                {responsibles.map((responsible, index) => {
                  const key = responsible.id ?? `${responsible.name}-${index}`;
                  const openIssues = responsible.openIssues ?? responsible.pendingIssues ?? 0;
                  const overdue = responsible.overdueIssues ?? 0;

                  return (
                    <tr key={key} className="border-t border-border hover:bg-muted/30 transition-colors" onClick={() => setPrefilledAgentId(responsible.id ?? '')}>
                      <td className="p-4 font-medium">
                        <div>{responsible.name}</div>
                        {responsible.email && (
                          <div className="text-xs text-muted-foreground">{responsible.email}</div>
                        )}
                      </td>
                      <td className="p-4 text-muted-foreground">{openIssues}</td>
                      <td className="p-4 text-muted-foreground">{overdue}</td>
                      <td className="p-4 text-muted-foreground">{renderSystems(responsible)}</td>
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
        onCreated={fetchData}
      />
    </MainLayout>
  );
}
