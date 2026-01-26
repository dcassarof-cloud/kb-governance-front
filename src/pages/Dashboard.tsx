import { useEffect, useState } from 'react';
import { FileText, AlertTriangle, Copy, CheckCircle, TrendingUp } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { MetricCard } from '@/components/shared/MetricCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { dashboardService } from '@/services/dashboard.service';
import { DashboardSummary } from '@/types';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['hsl(142, 76%, 36%)', 'hsl(38, 92%, 50%)', 'hsl(0, 84%, 60%)', 'hsl(216, 100%, 39%)'];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardService.getSummary().then((result) => {
      setData(result);
      setLoading(false);
    });
  }, []);

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

  const pieData = data?.byStatus.map(s => ({ name: s.status, value: s.count })) || [];
  const barData = data?.bySystem.map(s => ({ name: s.systemCode, artigos: s.count })) || [];

  return (
    <MainLayout>
      <PageHeader title="Dashboard" description="Visão geral da base de conhecimento" />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard title="Total de Manuais" value={data?.totalArticles || 0} icon={FileText} variant="primary" />
        <MetricCard title="OK" value={data?.okCount || 0} icon={CheckCircle} variant="success" />
        <MetricCard title="Issues" value={data?.issuesCount || 0} icon={AlertTriangle} variant="warning" />
        <MetricCard title="Duplicados" value={data?.duplicatesCount || 0} icon={Copy} variant="error" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-metric">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" /> Status de Governança</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {pieData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card-metric">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> Manuais por Sistema</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={barData}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="artigos" fill="hsl(216, 100%, 39%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </MainLayout>
  );
}
