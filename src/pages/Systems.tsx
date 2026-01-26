import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Progress } from '@/components/ui/progress';
import { systemsService } from '@/services/systems.service';
import { KbSystem } from '@/types';

export default function SystemsPage() {
  const [data, setData] = useState<KbSystem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    systemsService.getSystems().then((result) => { setData(result); setLoading(false); });
  }, []);

  return (
    <MainLayout>
      <PageHeader title="Sistemas" description="Sistemas conectados à base de conhecimento" />
      {loading ? <LoadingSkeleton variant="table" rows={5} /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((system) => (
            <div key={system.id} className="card-metric">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">{system.name}</h3>
                <StatusBadge status={system.isActive ? 'OK' : 'ERROR'} />
              </div>
              <p className="text-sm text-muted-foreground mb-2">{system.articlesCount} manuais</p>
              <div className="space-y-1">
                <div className="flex justify-between text-sm"><span>Qualidade</span><span className="font-semibold">{system.qualityScore}%</span></div>
                <Progress value={system.qualityScore} className="h-2" />
              </div>
            </div>
          ))}
        </div>
      )}
    </MainLayout>
  );
}
