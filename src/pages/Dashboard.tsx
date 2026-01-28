import { useEffect, useState } from 'react';
import { FileText, AlertTriangle, Copy, CheckCircle, TrendingUp, AlertCircle, RefreshCw } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { MetricCard } from '@/components/shared/MetricCard';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { dashboardService } from '@/services/dashboard.service';
import { DashboardSummary } from '@/types';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from '@/hooks/use-toast';

const COLORS = ['hsl(142, 76%, 36%)', 'hsl(38, 92%, 50%)', 'hsl(0, 84%, 60%)', 'hsl(216, 100%, 39%)'];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await dashboardService.getSummary();
      // Normaliza resposta: garante estrutura esperada
      const normalized: DashboardSummary = {
        totalArticles: result?.totalArticles ?? 0,
        okCount: result?.okCount ?? 0,
        issuesCount: result?.issuesCount ?? 0,
        duplicatesCount: result?.duplicatesCount ?? 0,
        bySystem: Array.isArray(result?.bySystem) ? result.bySystem : [],
        byStatus: Array.isArray(result?.byStatus) ? result.byStatus : [],
      };
      setData(normalized);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar dashboard';
      setError(message);
      toast({ title: 'Erro', description: message, variant: 'destructive' });
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
        <PageHeader title="Dashboard" description="Visão geral da base de conhecimento" />
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
        <PageHeader title="Dashboard" description="Visão geral da base de conhecimento" />
        <div className="card-metric">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h3 className="font-semibold text-lg mb-2">Erro ao carregar dashboard</h3>
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
      </MainLayout>
    );
  }

  // Dados seguros com fallbacks
  const totalArticles = data?.totalArticles ?? 0;
  const okCount = data?.okCount ?? 0;
  const issuesCount = data?.issuesCount ?? 0;
  const duplicatesCount = data?.duplicatesCount ?? 0;

  // Prepara dados para gráficos com guard clauses
  const pieData = Array.isArray(data?.byStatus)
    ? data.byStatus.map(s => ({
        name: s?.status || 'N/A',
        value: s?.count ?? 0,
      }))
    : [];

  const barData = Array.isArray(data?.bySystem)
    ? data.bySystem.map(s => ({
        name: s?.systemCode || 'N/A',
        artigos: s?.count ?? 0,
      }))
    : [];

  return (
    <MainLayout>
      <PageHeader title="Dashboard" description="Visão geral da base de conhecimento" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard title="Total de Manuais" value={totalArticles} icon={FileText} variant="primary" />
        <MetricCard title="OK" value={okCount} icon={CheckCircle} variant="success" />
        <MetricCard title="Issues" value={issuesCount} icon={AlertTriangle} variant="warning" />
        <MetricCard title="Duplicados" value={duplicatesCount} icon={Copy} variant="error" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-metric">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" /> Status de Governança
          </h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                >
                  {pieData.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-muted-foreground">
              Sem dados de status disponíveis
            </div>
          )}
        </div>

        <div className="card-metric">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" /> Manuais por Sistema
          </h3>
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={barData}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="artigos" fill="hsl(216, 100%, 39%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-muted-foreground">
              Sem dados de sistemas disponíveis
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
