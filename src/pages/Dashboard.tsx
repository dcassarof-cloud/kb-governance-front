import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CalendarClock,
  RefreshCw,
  UserX,
  ShieldAlert,
  Info,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';

import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { dashboardGovernanceService } from '@/services/dashboardGovernance.service';
import { dashboardService } from '@/services/dashboard.service';
import { hasRole } from '@/services/auth.service';
import { toApiErrorInfo, formatApiErrorInfo } from '@/lib/api-error-info';
import { DashboardGovernanceDto, DashboardSummary } from '@/types';
import { governanceTexts } from '@/governanceTexts';

const formatNumber = (value: number) => new Intl.NumberFormat('pt-BR').format(value);

export default function DashboardPage() {
  const navigate = useNavigate();
  const isManager = hasRole(['MANAGER', 'ADMIN']);

  const [data, setData] = useState<DashboardGovernanceDto | null>(null);
  const [summaryData, setSummaryData] = useState<DashboardSummary | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const reportWidgetError = useCallback((widget: string, error: unknown, fallbackMessage: string) => {
    const info = toApiErrorInfo(error, fallbackMessage);
    const formatted = formatApiErrorInfo(info);
    console.error(`[Dashboard:${widget}] request failed`, {
      message: info.message,
      correlationId: info.correlationId ?? 'n/a',
      error,
    });

    return formatted;
  }, []);

  const loadGovernance = useCallback(async () => {
    setDashboardLoading(true);
    setDashboardError(null);
    try {
      const dashboardResult = await dashboardGovernanceService.getDashboard();
      setData(dashboardResult);
    } catch (error) {
      const message = reportWidgetError('governance', error, governanceTexts.dashboard.errors.loadDashboard);
      setDashboardError(message);
    } finally {
      setDashboardLoading(false);
    }
  }, [reportWidgetError]);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const result = await dashboardService.getSummary();
      setSummaryData(result);
    } catch (error) {
      const message = reportWidgetError('summary', error, governanceTexts.dashboard.errors.loadDashboard);
      setSummaryError(message);
    } finally {
      setSummaryLoading(false);
    }
  }, [reportWidgetError]);


  const fetchData = useCallback(async () => {
    await Promise.allSettled([loadGovernance(), loadSummary()]);
  }, [loadGovernance, loadSummary]);

  useEffect(() => {
    if (!isManager) return;
    fetchData();
  }, [fetchData, isManager]);

  const summary = data?.summary;
  const bySystem = useMemo(() => summaryData?.bySystem ?? [], [summaryData]);
  const byStatus = useMemo(() => summaryData?.byStatus ?? [], [summaryData]);
  const systemChartData = useMemo(
    () =>
      bySystem.map((system) => ({
        name: system.systemName || system.systemCode || governanceTexts.general.notAvailable,
        value: system.total,
      })),
    [bySystem],
  );

  const statusChartData = useMemo(() => {
    return byStatus.map((status) => {
      const rawStatus = status.status;
      const label =
        governanceTexts.status.labels[rawStatus as keyof typeof governanceTexts.status.labels] ??
        governanceTexts.statusBadge.labels[rawStatus as keyof typeof governanceTexts.statusBadge.labels] ??
        rawStatus;
      return {
        name: label,
        value: status.total,
      };
    });
  }, [byStatus]);

  const handleNavigate = (params: Record<string, string | boolean | undefined>) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === '' || value === false) return;
      searchParams.set(key, String(value));
    });
    const query = searchParams.toString();
    navigate(`/governance${query ? `?${query}` : ''}`);
  };

  if (!isManager) {
    return (
      <MainLayout>
        <PageHeader title={governanceTexts.dashboard.title} description={governanceTexts.dashboard.description} />
        <div className="card-metric">
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <ShieldAlert className="h-12 w-12 text-primary mb-4" />
            <h3 className="font-semibold text-lg mb-2">{governanceTexts.dashboard.managerOnly.title}</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-lg">
              {governanceTexts.dashboard.managerOnly.description}
            </p>
            <button
              type="button"
              onClick={() => navigate('/governance')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              {governanceTexts.dashboard.managerOnly.cta}
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  const summaryCards = [
    {
      key: 'totalArticles',
      title: 'Total de artigos',
      value: summaryData ? formatNumber(summaryData.totalArticles) : '—',
      icon: Info,
      tone: 'success',
      action: () => handleNavigate({}),
    },
    {
      key: 'articlesOk',
      title: 'Artigos saudáveis',
      value: summaryData ? formatNumber(summaryData.articlesOk) : '—',
      icon: ShieldAlert,
      tone: 'success',
      action: () => handleNavigate({}),
    },
    {
      key: 'articlesWithIssues',
      title: 'Artigos com pendências',
      value: summaryData ? formatNumber(summaryData.articlesWithIssues) : '—',
      icon: AlertCircle,
      tone: 'warning',
      action: () => handleNavigate({ type: 'NOT_AI_READY' }),
    },
    {
      key: 'totalIssues',
      title: 'Total de pendências',
      value: summaryData ? formatNumber(summaryData.totalIssues) : '—',
      icon: AlertTriangle,
      tone: 'warning',
      action: () => handleNavigate({ status: 'OPEN' }),
    },
    {
      key: 'duplicatesCount',
      title: 'Duplicidades',
      value: summaryData ? formatNumber(summaryData.duplicatesCount) : '—',
      icon: AlertTriangle,
      tone: 'error',
      action: () => handleNavigate({ type: 'DUPLICATE_CONTENT' }),
    },
    {
      key: 'openIssues',
      title: governanceTexts.dashboard.cards.openIssues,
      value: summary ? formatNumber(summary.openIssues) : '—',
      icon: AlertTriangle,
      tone: 'warning',
      action: () => handleNavigate({ status: 'OPEN' }),
    },
    {
      key: 'overdueIssues',
      title: governanceTexts.dashboard.cards.overdueIssues,
      value: summary ? formatNumber(summary.overdueIssues) : '—',
      icon: CalendarClock,
      tone: 'error',
      action: () => handleNavigate({ overdue: true }),
    },
    {
      key: 'unassignedIssues',
      title: governanceTexts.dashboard.cards.unassignedIssues,
      value: summary ? formatNumber(summary.unassignedIssues) : '—',
      icon: UserX,
      tone: 'warning',
      action: () => handleNavigate({ unassigned: true }),
    },
  ] as const;

  return (
    <MainLayout>
      <PageHeader title={governanceTexts.dashboard.title} description={governanceTexts.dashboard.description} />


      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 mb-8">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          const toneClasses = {
            success: 'border-success/40 bg-success/5 text-success',
            warning: 'border-warning/40 bg-warning/5 text-warning',
            error: 'border-destructive/40 bg-destructive/5 text-destructive',
          }[card.tone];
          return (
            <button
              key={card.key}
              type="button"
              onClick={card.action}
              className={`card-metric flex flex-col gap-4 text-left border-l-4 ${toneClasses}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                  {dashboardLoading ? (
                    <LoadingSkeleton variant="text" className="h-9 mt-2 w-20" />
                  ) : (
                    <p className="text-3xl font-semibold text-foreground mt-2">{card.value}</p>
                  )}
                </div>
                <div className="h-10 w-10 rounded-full bg-background/60 flex items-center justify-center">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <span className="text-xs font-medium text-muted-foreground">{governanceTexts.dashboard.cards.cta}</span>
            </button>
          );
        })}

      </section>

      {dashboardError && (
        <div className="mb-6 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
          <p className="text-destructive mb-2">{dashboardError}</p>
          <Button type="button" variant="outline" size="sm" onClick={loadGovernance}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {governanceTexts.general.retry}
          </Button>
        </div>
      )}

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-metric">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">{governanceTexts.dashboard.charts.issuesBySystem}</h3>
            <Badge variant="secondary">{formatNumber(bySystem.length)}</Badge>
          </div>

          {summaryLoading ? (
            <LoadingSkeleton variant="card" className="min-h-[220px]" />
          ) : summaryError ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
              <p className="text-destructive mb-2">{summaryError}</p>
              <Button type="button" variant="outline" size="sm" onClick={loadSummary}>
                <RefreshCw className="h-4 w-4 mr-2" />
                {governanceTexts.general.retry}
              </Button>
            </div>
          ) : systemChartData.length === 0 ? (
            <EmptyState
              title={governanceTexts.dashboard.charts.emptyTitle}
              description={governanceTexts.dashboard.charts.emptyDescription}
            />
          ) : (
            <ChartContainer
              config={{
                value: {
                  label: governanceTexts.dashboard.charts.issuesBySystem,
                  color: 'hsl(var(--primary))',
                },
              }}
              className="h-[260px] w-full"
            >
              <BarChart data={systemChartData} margin={{ left: 8, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} interval={0} />
                <YAxis tickLine={false} axisLine={false} width={32} />
                <Tooltip content={<ChartTooltipContent />} cursor={{ fill: 'hsl(var(--muted))' }} />
                <Bar dataKey="value" fill="var(--color-value)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          )}
        </div>

        <div className="card-metric">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">{governanceTexts.dashboard.charts.issuesByStatus}</h3>
            <Badge variant="secondary">{formatNumber(byStatus.length)}</Badge>
          </div>

          {summaryLoading ? (
            <LoadingSkeleton variant="card" className="min-h-[220px]" />
          ) : summaryError ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
              <p className="text-destructive mb-2">{summaryError}</p>
              <Button type="button" variant="outline" size="sm" onClick={loadSummary}>
                <RefreshCw className="h-4 w-4 mr-2" />
                {governanceTexts.general.retry}
              </Button>
            </div>
          ) : statusChartData.length === 0 ? (
            <EmptyState
              title={governanceTexts.dashboard.charts.emptyTitle}
              description={governanceTexts.dashboard.charts.emptyDescription}
            />
          ) : (
            <ChartContainer
              config={{
                value: {
                  label: governanceTexts.dashboard.charts.issuesByStatus,
                  color: 'hsl(var(--primary))',
                },
              }}
              className="h-[260px] w-full"
            >
              <BarChart data={statusChartData} margin={{ left: 8, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} interval={0} />
                <YAxis tickLine={false} axisLine={false} width={32} />
                <Tooltip content={<ChartTooltipContent />} cursor={{ fill: 'hsl(var(--muted))' }} />
                <Bar dataKey="value" fill="var(--color-value)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          )}
        </div>
      </section>

      {!dashboardLoading && !summaryLoading && !summary && !summaryData && (
        <div className="mt-6">
          <EmptyState
            title={governanceTexts.dashboard.empty.title}
            description={governanceTexts.dashboard.empty.description}
          />
        </div>
      )}

      {dashboardError && summaryError && (
        <div className="mt-6 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>{governanceTexts.dashboard.errors.loadDashboard}</span>
          </div>
          <Button onClick={fetchData} type="button" variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            {governanceTexts.general.retry}
          </Button>
        </div>
      )}
    </MainLayout>
  );
}
