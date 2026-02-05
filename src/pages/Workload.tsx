import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, RefreshCw, Users } from 'lucide-react';

import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';

import { governanceService } from '@/services/governance.service';
import { GovernanceIssueDto, GovernanceResponsible, GovernanceResponsiblesSummary } from '@/types';
import { toast } from '@/hooks/use-toast';
import { governanceTexts } from '@/governanceTexts';

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
  issue.responsibleName || issue.responsible || issue.responsibleId || '';

export default function WorkloadPage() {
  const [summary, setSummary] = useState<GovernanceResponsiblesSummary | null>(null);
  const [issues, setIssues] = useState<GovernanceIssueDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryResult, issuesResult] = await Promise.allSettled([
        governanceService.getResponsiblesSummary(),
        governanceService.listIssues({ page: 1, size: 200 }),
      ]);

      if (summaryResult.status === 'fulfilled') {
        setSummary(summaryResult.value);
      }

      if (issuesResult.status === 'fulfilled') {
        setIssues(issuesResult.value?.data ?? []);
      }

      if (summaryResult.status === 'rejected' && issuesResult.status === 'rejected') {
        throw summaryResult.reason ?? issuesResult.reason;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : governanceTexts.workload.loadError;
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
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {governanceTexts.general.update}
          </Button>
        </div>

        {loading ? (
          <LoadingSkeleton variant="table" rows={5} />
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h3 className="font-semibold text-lg mb-2">{governanceTexts.workload.loadError}</h3>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {governanceTexts.general.retry}
            </Button>
          </div>
        ) : responsibles.length === 0 ? (
          <EmptyState
            icon={Users}
            title={governanceTexts.workload.emptyTitle}
            description={governanceTexts.workload.emptyDescription}
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
                    <tr key={key} className="border-t border-border hover:bg-muted/30 transition-colors">
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
    </MainLayout>
  );
}
