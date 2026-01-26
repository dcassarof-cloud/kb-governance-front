import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { governanceService } from '@/services/governance.service';
import { GovernanceIssue, PaginatedResponse } from '@/types';

export default function GovernancePage() {
  const [data, setData] = useState<PaginatedResponse<GovernanceIssue> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    governanceService.getIssues().then((result) => { setData(result); setLoading(false); });
  }, []);

  return (
    <MainLayout>
      <PageHeader title="Governança" description="Issues de qualidade da base de conhecimento" />
      {loading ? <LoadingSkeleton variant="table" rows={5} /> : (
        <div className="grid gap-4">
          {data?.data.map((issue) => (
            <div key={issue.id} className="card-metric flex items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <StatusBadge status={issue.severity} />
                  <StatusBadge status={issue.status} />
                  <span className="text-xs text-muted-foreground">{issue.systemCode}</span>
                </div>
                <h3 className="font-semibold">{issue.articleTitle}</h3>
                <p className="text-sm text-muted-foreground mt-1">{issue.details}</p>
              </div>
              <span className="text-xs text-muted-foreground">{new Date(issue.createdAt).toLocaleDateString('pt-BR')}</span>
            </div>
          ))}
        </div>
      )}
    </MainLayout>
  );
}
