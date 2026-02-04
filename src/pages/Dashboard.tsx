import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertOctagon,
  AlertTriangle,
  CalendarClock,
  CheckCircle,
  RefreshCw,
  TrendingUp,
  UserX,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { Badge } from '@/components/ui/badge';
import { dashboardGovernanceService } from '@/services/dashboardGovernance.service';
import { DashboardGovernanceDto, DashboardGovernanceTrend } from '@/types';
import { toast } from '@/hooks/use-toast';
import { governanceTexts } from '@/governanceTexts';

const formatNumber = (value: number) => new Intl.NumberFormat('pt-BR').format(value);

const formatDate = (value?: string | null) => {
  if (!value) return governanceTexts.general.notAvailable;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return governanceTexts.general.notAvailable;
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(date);
};

const formatPercent = (value: number) => `${Math.round(value)}%`;

const resolveIssueType = (type?: string | null) => {
  if (!type) return governanceTexts.general.notAvailable;
  return governanceTexts.issueTypes[type as keyof typeof governanceTexts.issueTypes] ?? type;
};

const getAgeDays = (createdAt?: string | null, ageDays?: number | null) => {
  if (typeof ageDays === 'number') return ageDays;
  if (!createdAt) return null;
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) return null;
  const diff = Date.now() - created.getTime();
  return Math.max(Math.floor(diff / (1000 * 60 * 60 * 24)), 0);
};

const getHealthTone = (score: number) => {
  if (score >= 80) return 'success';
  if (score >= 60) return 'warning';
  return 'error';
};

const getTrendBadge = (trend: DashboardGovernanceTrend) => {
  const isPositive = trend.direction === 'up';
  const value = Math.abs(trend.delta);
  const signal = isPositive ? '↑' : '↓';
  return `${signal} ${value}${trend.key === 'sla' ? '' : '%'}`;
};

const resolveTrendTone = (trend: DashboardGovernanceTrend) => {
  if (trend.key === 'resolvedIssues') {
    return trend.direction === 'up' ? 'status-ok' : 'status-error';
  }
  return trend.direction === 'up' ? 'status-error' : 'status-ok';
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardGovernanceDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await dashboardGovernanceService.getDashboard();
      setData(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : governanceTexts.dashboard.errors.loadDashboard;
      setError(message);
      toast({ title: governanceTexts.general.errorTitle, description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const summary = data?.summary;
  const systemsAtRisk = useMemo(() => {
    if (!data?.systemsAtRisk) return [];
    return [...data.systemsAtRisk].sort((a, b) => a.healthScore - b.healthScore);
  }, [data?.systemsAtRisk]);

  const handleNavigate = (params: Record<string, string | boolean | undefined>) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === '' || value === false) return;
      searchParams.set(key, String(value));
    });
    const query = searchParams.toString();
    navigate(`/governance${query ? `?${query}` : ''}`);
  };

  if (loading) {
    return (
      <MainLayout>
        <PageHeader title={governanceTexts.dashboard.title} description={governanceTexts.dashboard.description} />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 mb-8">
          {[1, 2, 3, 4, 5].map((i) => (
            <LoadingSkeleton key={i} variant="card" />
          ))}
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <LoadingSkeleton key={i} variant="card" className="min-h-[260px]" />
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
      key: 'errorIssues',
      title: governanceTexts.dashboard.cards.errorIssues,
      value: formatNumber(summary.errorIssues),
      icon: AlertOctagon,
      tone: 'error',
      action: () => handleNavigate({ severity: 'CRITICAL' }),
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
      key: 'slaCompliance',
      title: governanceTexts.dashboard.cards.slaCompliance,
      value: formatPercent(summary.slaCompliancePercent),
      icon: CheckCircle,
      tone: summary.slaCompliancePercent >= 95 ? 'success' : summary.slaCompliancePercent >= 85 ? 'warning' : 'error',
      action: () => handleNavigate({ status: 'OPEN' }),
    },
  ];

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

      <section className="card-metric mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">{governanceTexts.dashboard.systems.title}</h3>
            <p className="text-sm text-muted-foreground">{governanceTexts.dashboard.systems.subtitle}</p>
          </div>
          <Badge variant="secondary">{governanceTexts.dashboard.systems.badge}</Badge>
        </div>
        {systemsAtRisk.length === 0 ? (
          <EmptyState
            title={governanceTexts.dashboard.systems.emptyTitle}
            description={governanceTexts.dashboard.systems.emptyDescription}
          />
        ) : (
          <div className="table-container">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="text-left p-4 font-semibold">{governanceTexts.dashboard.systems.columns.system}</th>
                  <th className="text-left p-4 font-semibold">{governanceTexts.dashboard.systems.columns.health}</th>
                  <th className="text-left p-4 font-semibold">{governanceTexts.dashboard.systems.columns.errors}</th>
                  <th className="text-left p-4 font-semibold">{governanceTexts.dashboard.systems.columns.overdue}</th>
                  <th className="text-left p-4 font-semibold">{governanceTexts.dashboard.systems.columns.unassigned}</th>
                </tr>
              </thead>
              <tbody>
                {systemsAtRisk.map((system) => {
                  const tone = getHealthTone(system.healthScore);
                  const badgeVariant =
                    tone === 'success' ? 'status-ok' : tone === 'warning' ? 'status-warning' : 'status-error';
                  return (
                    <tr
                      key={system.systemCode}
                      onClick={() => handleNavigate({ system: system.systemCode })}
                      className="border-t border-border hover:bg-muted/40 cursor-pointer"
                    >
                      <td className="p-4 font-medium">{system.systemName}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${badgeVariant}`}>
                          {formatNumber(system.healthScore)}
                        </span>
                      </td>
                      <td className="p-4 text-muted-foreground">{formatNumber(system.errorIssues)}</td>
                      <td className="p-4 text-muted-foreground">{formatNumber(system.overdueIssues)}</td>
                      <td className="p-4 text-muted-foreground">{formatNumber(system.unassignedIssues)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="card-metric">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">{governanceTexts.dashboard.attention.overdueTitle}</h3>
              <p className="text-sm text-muted-foreground">{governanceTexts.dashboard.attention.overdueSubtitle}</p>
            </div>
            <Badge variant="secondary">{governanceTexts.dashboard.attention.overdueBadge}</Badge>
          </div>
          {data.overdueToday.length === 0 ? (
            <EmptyState
              title={governanceTexts.dashboard.attention.emptyTitle}
              description={governanceTexts.dashboard.attention.emptyOverdue}
            />
          ) : (
            <ul className="space-y-3">
              {data.overdueToday.slice(0, 5).map((issue) => (
                <li key={issue.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/governance/issues/${issue.id}`)}
                    className="w-full rounded-lg border border-border p-4 text-left hover:bg-muted/30"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm">
                        {issue.systemName ?? issue.systemCode ?? governanceTexts.general.notAvailable}
                      </span>
                      <span className="text-xs text-destructive font-semibold">
                        {governanceTexts.dashboard.attention.slaLabel} {formatDate(issue.slaDueAt)}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-2 flex flex-wrap gap-2">
                      <span>{resolveIssueType(issue.type)}</span>
                      <span>•</span>
                      <span>{issue.title ?? governanceTexts.dashboard.attention.issueFallback}</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card-metric">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">{governanceTexts.dashboard.attention.unassignedTitle}</h3>
              <p className="text-sm text-muted-foreground">{governanceTexts.dashboard.attention.unassignedSubtitle}</p>
            </div>
            <Badge variant="secondary">{governanceTexts.dashboard.attention.unassignedBadge}</Badge>
          </div>
          {data.unassigned.length === 0 ? (
            <EmptyState
              title={governanceTexts.dashboard.attention.emptyTitle}
              description={governanceTexts.dashboard.attention.emptyUnassigned}
            />
          ) : (
            <ul className="space-y-3">
              {data.unassigned.slice(0, 5).map((issue) => {
                const age = getAgeDays(issue.createdAt, issue.ageDays);
                return (
                  <li key={issue.id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/governance?assignIssueId=${issue.id}&unassigned=true`)}
                      className="w-full rounded-lg border border-border p-4 text-left hover:bg-muted/30"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm">
                          {issue.systemName ?? issue.systemCode ?? governanceTexts.general.notAvailable}
                        </span>
                        <span className="text-xs text-warning font-semibold">
                          {age !== null
                            ? governanceTexts.dashboard.attention.ageLabel(age)
                            : governanceTexts.general.notAvailable}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-2 flex flex-wrap gap-2">
                        <span>{resolveIssueType(issue.type)}</span>
                        <span>•</span>
                        <span>{issue.title ?? governanceTexts.dashboard.attention.issueFallback}</span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <section className="card-metric">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-primary" />
          <div>
            <h3 className="text-lg font-semibold">{governanceTexts.dashboard.trends.title}</h3>
            <p className="text-sm text-muted-foreground">{governanceTexts.dashboard.trends.subtitle}</p>
          </div>
        </div>
        {data.trends.length === 0 ? (
          <EmptyState
            title={governanceTexts.dashboard.trends.emptyTitle}
            description={governanceTexts.dashboard.trends.emptyDescription}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data.trends.map((trend) => {
              const badgeTone = resolveTrendTone(trend);
              const action =
                trend.key === 'resolvedIssues'
                  ? () => handleNavigate({ status: 'RESOLVED' })
                  : trend.key === 'sla'
                    ? () => handleNavigate({ overdue: true })
                    : () => handleNavigate({ status: 'OPEN' });
              return (
                <button
                  key={`${trend.key}-${trend.label}`}
                  type="button"
                  onClick={action}
                  className="rounded-lg border border-border p-4 text-left hover:bg-muted/30"
                >
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${badgeTone}`}>
                    {getTrendBadge(trend)}
                  </span>
                  <p className="mt-3 font-semibold text-sm">{trend.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {trend.context ? `${trend.context}` : governanceTexts.dashboard.trends.defaultContext}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </MainLayout>
  );
}
