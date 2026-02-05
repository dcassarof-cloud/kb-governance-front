import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CalendarClock,
  RefreshCw,
  UserX,
  ShieldAlert,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';

import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { Badge } from '@/components/ui/badge';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { dashboardGovernanceService } from '@/services/dashboardGovernance.service';
import { dashboardService } from '@/services/dashboard.service';
import { needsService } from '@/services/needs.service';
import { hasRole } from '@/services/auth.service';
import { DashboardGovernanceDto, DashboardSummary, NeedItem } from '@/types';
import { toast } from '@/hooks/use-toast';
import { governanceTexts } from '@/governanceTexts';

const formatNumber = (value: number) => new Intl.NumberFormat('pt-BR').format(value);

export default function DashboardPage() {
  const navigate = useNavigate();
  const isManager = hasRole(['MANAGER', 'ADMIN']);
  const [data, setData] = useState<DashboardGovernanceDto | null>(null);
  const [summaryData, setSummaryData] = useState<DashboardSummary | null>(null);
  const [needsData, setNeedsData] = useState<NeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashboardResult, summaryResult, needsResult] = await Promise.allSettled([
        dashboardGovernanceService.getDashboard(),
        dashboardService.getSummary(),
        needsService.listNeeds({ page: 1, size: 50 }),
      ]);

      if (dashboardResult.status === 'fulfilled') {
        setData(dashboardResult.value);
      }

      if (summaryResult.status === 'fulfilled') {
        setSummaryData(summaryResult.value);
      }

      if (needsResult.status === 'fulfilled') {
        setNeedsData(needsResult.value?.data ?? []);
      }

      if (
        dashboardResult.status === 'rejected' &&
        summaryResult.status === 'rejected' &&
        needsResult.status === 'rejected'
      ) {
        throw dashboardResult.reason ?? summaryResult.reason ?? needsResult.reason;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : governanceTexts.dashboard.errors.loadDashboard;
      setError(message);
      toast({ title: governanceTexts.general.errorTitle, description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isManager) {
      fetchData();
      return;
    }
    setLoading(false);
  }, [isManager]);

  const summary = data?.summary;
  const bySystem = summaryData?.bySystem ?? [];
  const byStatus = summaryData?.byStatus ?? [];
  const needsOpen = useMemo(() => needsData.filter((need) => need.status === 'OPEN').length, [needsData]);
  const needsRecurring = useMemo(
    () =>
      needsData.filter((need) => {
        const occurrences = need.occurrences ?? need.quantity ?? 0;
        return occurrences > 1;
      }).length,
    [needsData],
  );

  const systemChartData = useMemo(
    () =>
      bySystem.map((system) => ({
        name: system.systemName || system.systemCode || governanceTexts.general.notAvailable,
        value: system.count,
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
        value: status.count,
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

  if (loading) {
    return (
      <MainLayout>
        <PageHeader title={governanceTexts.dashboard.title} description={governanceTexts.dashboard.description} />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <LoadingSkeleton key={i} variant="card" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {[1, 2].map((i) => (
            <LoadingSkeleton key={i} variant="card" className="min-h-[260px]" />
          ))}
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <PageHeader title={governanceTexts.dashboard.title} description={governanceTexts.dashboard.description} />
        <div className="card-metric">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h3 className="font-semibold text-lg mb-2">{governanceTexts.dashboard.errors.loadDashboard}</h3>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <button
              onClick={fetchData}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              <RefreshCw className="h-4 w-4" />
              {governanceTexts.general.retry}
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!summary) {
    return (
      <MainLayout>
        <PageHeader title={governanceTexts.dashboard.title} description={governanceTexts.dashboard.description} />
        <EmptyState
          title={governanceTexts.dashboard.empty.title}
          description={governanceTexts.dashboard.empty.description}
        />
      </MainLayout>
    );
  }

  const summaryCards = [
    {
      key: 'openIssues',
      title: governanceTexts.dashboard.cards.openIssues,
      value: formatNumber(summary.openIssues),
      icon: AlertTriangle,
      tone: 'warning',
      action: () => handleNavigate({ status: 'OPEN' }),
    },
    {
      key: 'overdueIssues',
      title: governanceTexts.dashboard.cards.overdueIssues,
      value: formatNumber(summary.overdueIssues),
      icon: CalendarClock,
      tone: 'error',
      action: () => handleNavigate({ overdue: true }),
    },
    {
      key: 'unassignedIssues',
      title: governanceTexts.dashboard.cards.unassignedIssues,
      value: formatNumber(summary.unassignedIssues),
      icon: UserX,
      tone: 'warning',
      action: () => handleNavigate({ unassigned: true }),
    },
    {
      key: 'needsOpenRecurring',
      title: governanceTexts.dashboard.cards.needsOpenRecurring,
      value: `${formatNumber(needsOpen)} • ${formatNumber(needsRecurring)}`,
      icon: ShieldAlert,
      tone: needsRecurring > 0 ? 'error' : needsOpen > 0 ? 'warning' : 'success',
      action: () => navigate('/needs'),
    },
  ];

  return (
    <MainLayout>
      <PageHeader title={governanceTexts.dashboard.title} description={governanceTexts.dashboard.description} />

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
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
                  <p className="text-3xl font-semibold text-foreground mt-2">{card.value}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-background/60 flex items-center justify-center">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                {governanceTexts.dashboard.cards.cta}
              </span>
            </button>
          );
        })}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-metric">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">{governanceTexts.dashboard.charts.issuesBySystem}</h3>
            <Badge variant="secondary">{formatNumber(bySystem.length)}</Badge>
          </div>
          {systemChartData.length === 0 ? (
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
          {statusChartData.length === 0 ? (
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
    </MainLayout>
  );
}
