import { useEffect, useState } from 'react';
import { FileText, AlertTriangle, CheckCircle, TrendingUp, AlertCircle, RefreshCw, AlertOctagon } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { MetricCard } from '@/components/shared/MetricCard';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { dashboardService } from '@/services/dashboard.service';
import { DashboardSummary } from '@/types';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from '@/hooks/use-toast';
import { governanceTexts } from '@/governanceTexts';

const COLORS = ['hsl(220, 14%, 70%)', 'hsl(220, 14%, 85%)'];
const IMPACT_DEFAULT_COLOR = 'hsl(220, 14%, 80%)';
const IMPACT_CRITICAL_COLOR = 'hsl(0, 84%, 60%)';

export default function DashboardPage() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await dashboardService.getSummary();
      const metrics = {
        totalArticles: result?.totalArticles,
        articlesOk: result?.articlesOk,
        articlesWithIssues: result?.articlesWithIssues,
        totalIssues: result?.totalIssues,
      };
      const invalidMetrics = Object.entries(metrics).filter(
        ([, value]) => value === null || value === undefined || Number.isNaN(value)
      );
      if (invalidMetrics.length > 0) {
        toast({
          title: governanceTexts.general.alertTitle,
          description: governanceTexts.dashboard.errors.invalidMetrics,
        });
      }
      // Normaliza resposta: garante estrutura esperada
      const normalized: DashboardSummary = {
        totalArticles: typeof result?.totalArticles === 'number' ? result.totalArticles : 0,
        articlesOk: typeof result?.articlesOk === 'number' ? result.articlesOk : 0,
        articlesWithIssues: typeof result?.articlesWithIssues === 'number' ? result.articlesWithIssues : 0,
        totalIssues: typeof result?.totalIssues === 'number' ? result.totalIssues : 0,
        bySystem: Array.isArray(result?.bySystem) ? result.bySystem : [],
        byStatus: Array.isArray(result?.byStatus) ? result.byStatus : [],
      };
      setData(normalized);
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

  // Loading state
  if (loading) {
    return (
      <MainLayout>
        <PageHeader title={governanceTexts.dashboard.title} description={governanceTexts.dashboard.description} />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => <LoadingSkeleton key={i} variant="card" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LoadingSkeleton variant="chart" />
          <LoadingSkeleton variant="chart" />
        </div>
      </MainLayout>
    );
  }

  // Error state
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

  // Dados seguros com fallbacks
  const totalArticles = data?.totalArticles ?? 0;
  const okCount = data?.articlesOk ?? 0;
  const articlesWithIssues = data?.articlesWithIssues ?? 0;
  const totalIssues = data?.totalIssues ?? 0;

  // Calcula percentuais reais
  const okPercent = totalArticles > 0 ? Math.round((okCount / totalArticles) * 100) : 0;
  const issuesPercent = totalArticles > 0 ? Math.round((articlesWithIssues / totalArticles) * 100) : 0;

  // Prepara dados para gráficos com guard clauses
  const mapImpactLabel = (label: unknown) => {
    const normalizedLabel = typeof label === 'string' ? label : String(label ?? '');
    if (normalizedLabel in governanceTexts.severity.labels) {
      return governanceTexts.severity.labels[normalizedLabel as keyof typeof governanceTexts.severity.labels];
    }
    return normalizedLabel || governanceTexts.general.notAvailable;
  };

  const impactData = Array.isArray(data?.byStatus)
    ? data.byStatus.map((s) => {
        const rawLabel = s?.status ?? governanceTexts.general.notAvailable;
        return {
          name: mapImpactLabel(rawLabel),
          value: s?.count ?? 0,
          rawLabel,
        };
      })
    : [];

  const pendingPercentData = [
    {
      name: governanceTexts.dashboard.charts.pendingLegend.withPending,
      value: articlesWithIssues,
    },
    {
      name: governanceTexts.dashboard.charts.pendingLegend.withoutPending,
      value: Math.max(totalArticles - articlesWithIssues, 0),
    },
  ];

  const isCriticalImpact = (label: unknown) => {
    const normalizedLabel = typeof label === 'string' ? label : String(label ?? '');
    return normalizedLabel.toLowerCase().includes('crític') || normalizedLabel.toUpperCase() === 'CRITICAL';
  };

  return (
    <MainLayout>
      <PageHeader title={governanceTexts.dashboard.title} description={governanceTexts.dashboard.description} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title={governanceTexts.dashboard.metrics.totalManuals}
          value={totalArticles}
          icon={FileText}
          variant="primary"
        />
        <MetricCard
          title={governanceTexts.dashboard.metrics.manualsOk}
          value={okCount}
          icon={CheckCircle}
          variant="success"
          subtitle={totalArticles > 0 ? governanceTexts.dashboard.metrics.percentOfTotal(okPercent) : undefined}
        />
        <MetricCard
          title={governanceTexts.dashboard.metrics.manualsWithPending}
          value={articlesWithIssues}
          icon={AlertTriangle}
          variant="warning"
          subtitle={totalArticles > 0 ? governanceTexts.dashboard.metrics.percentWithPending(issuesPercent) : undefined}
        />
        <MetricCard
          title={governanceTexts.dashboard.metrics.totalPending}
          value={totalIssues}
          icon={AlertOctagon}
          variant="error"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-metric">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" /> {governanceTexts.dashboard.charts.pendingPercentTitle}
          </h3>
          <p className="text-sm text-muted-foreground mb-3">{governanceTexts.dashboard.charts.pendingPercentSubtitle}</p>
          {totalArticles > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pendingPercentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                >
                  {pendingPercentData.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-muted-foreground">
              {governanceTexts.dashboard.charts.noChartData}
            </div>
          )}
        </div>

        <div className="card-metric">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" /> {governanceTexts.dashboard.charts.impactDistributionTitle}
          </h3>
          <p className="text-sm text-muted-foreground mb-3">{governanceTexts.dashboard.charts.impactDistributionSubtitle}</p>
          {impactData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={impactData}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {impactData.map((item, index) => (
                    <Cell
                      key={`${item.name}-${index}`}
                      fill={isCriticalImpact(item.rawLabel ?? item.name) ? IMPACT_CRITICAL_COLOR : IMPACT_DEFAULT_COLOR}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-muted-foreground">
              {governanceTexts.dashboard.charts.noChartData}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
