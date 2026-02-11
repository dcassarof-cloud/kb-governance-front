import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, RefreshCw, UserCheck, AlertTriangle, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { MetricCard } from '@/components/shared/MetricCard';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { ApiErrorBanner } from '@/components/shared/ApiErrorBanner';
import { Button } from '@/components/ui/button';

import { governanceService } from '@/services/governance.service';
import { GovernanceResponsiblesSummary, GovernanceResponsible } from '@/types';
import { toast } from '@/hooks/use-toast';
import { governanceTexts } from '@/governanceTexts';
import { formatApiErrorInfo, toApiErrorInfo } from '@/lib/api-error-info';

export default function ResponsiblesPage() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<GovernanceResponsiblesSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await governanceService.getResponsiblesSummary();
      setSummary(result);
    } catch (err) {
      const info = toApiErrorInfo(err, governanceTexts.responsibles.loadError);
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

  const handleQuickAssign = (responsible: GovernanceResponsible) => {
    navigate(`/governance?assignTo=${encodeURIComponent(responsible.name)}`);
  };

  return (
    <MainLayout>
      <PageHeader title={governanceTexts.responsibles.title} description={governanceTexts.responsibles.description} />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {[1, 2, 3].map((item) => (
            <LoadingSkeleton key={item} variant="card" />
          ))}
        </div>
      ) : error ? (
        <div className="card-metric mb-6">
          <ApiErrorBanner
            title="Falha ao carregar responsáveis"
            description={error}
            onRetry={fetchData}
          />
          <EmptyState
            icon={AlertCircle}
            title={governanceTexts.responsibles.loadError}
            description="Não foi possível carregar os responsáveis."
            action={{ label: 'Recarregar', onClick: fetchData }}
          />
        </div>
      ) : summaryMetrics.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {summaryMetrics.map((metric) => (
            <MetricCard
              key={metric.key}
              title={metric.title}
              value={metric.value as number}
              icon={metric.icon}
              variant={metric.variant}
            />
          ))}
        </div>
      ) : null}

      <div className="card-metric">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">{governanceTexts.responsibles.table.title}</h3>
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {governanceTexts.general.update}
          </Button>
        </div>

        {loading ? (
          <LoadingSkeleton variant="table" rows={5} />
        ) : error ? (
          <>
            <ApiErrorBanner
              title="Falha ao carregar responsáveis"
              description={error}
              onRetry={fetchData}
            />
            <EmptyState
              icon={AlertCircle}
              title={governanceTexts.responsibles.loadError}
              description="Não foi possível carregar os responsáveis."
              action={{ label: 'Recarregar', onClick: fetchData }}
            />
          </>
        ) : responsibles.length === 0 ? (
          <EmptyState
            icon={Users}
            title={governanceTexts.responsibles.table.emptyTitle}
            description={governanceTexts.responsibles.table.emptyDescription}
          />
        ) : (
          <div className="table-container overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-semibold text-sm">{governanceTexts.responsibles.table.headers.responsible}</th>
                  <th className="text-left p-4 font-semibold text-sm">{governanceTexts.responsibles.table.headers.open}</th>
                  <th className="text-left p-4 font-semibold text-sm">{governanceTexts.responsibles.table.headers.overdue}</th>
                  <th className="text-left p-4 font-semibold text-sm">{governanceTexts.responsibles.table.headers.averageSla}</th>
                  <th className="text-left p-4 font-semibold text-sm">{governanceTexts.responsibles.table.headers.actions}</th>
                </tr>
              </thead>
              <tbody>
                {responsibles.map((responsible, index) => {
                  const id = responsible.id ?? `${responsible.name}-${index}`;
                  const openIssues =
                    responsible.openIssues ?? responsible.pendingIssues ?? 0;
                  const overdue = responsible.overdueIssues ?? 0;
                  const sla = responsible.avgSlaDays ?? null;

                  return (
                    <tr key={id} className="border-t border-border hover:bg-muted/30 transition-colors">
                      <td className="p-4 font-medium">
                        <div>{responsible.name}</div>
                        {responsible.email && (
                          <div className="text-xs text-muted-foreground">{responsible.email}</div>
                        )}
                      </td>
                      <td className="p-4 text-muted-foreground">{openIssues}</td>
                      <td className="p-4 text-muted-foreground">{overdue}</td>
                      <td className="p-4 text-muted-foreground">
                        {sla !== null ? governanceTexts.responsibles.table.days(sla) : governanceTexts.general.notAvailable}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleBacklog(responsible)}
                          >
                            {governanceTexts.responsibles.table.actions.backlog}
                          </Button>
                          <Button size="sm" onClick={() => handleQuickAssign(responsible)}>
                            {governanceTexts.responsibles.table.actions.quickAssign}
                          </Button>
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
    </MainLayout>
  );
}
