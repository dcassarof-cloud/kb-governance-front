import { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { governanceService } from '@/services/governance.service';
import { DuplicateGroup } from '@/types';

export default function DuplicatesPage() {
  const [data, setData] = useState<DuplicateGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    governanceService.getDuplicates().then((result) => { setData(result); setLoading(false); });
  }, []);

  return (
    <MainLayout>
      <PageHeader title="Duplicados" description="Grupos de artigos duplicados identificados" />
      {loading ? <LoadingSkeleton variant="table" rows={3} /> : (
        <div className="space-y-4">
          {data.map((group) => (
            <div key={group.hash} className="card-metric">
              <button className="w-full flex items-center justify-between" onClick={() => setExpanded(expanded === group.hash ? null : group.hash)}>
                <div className="flex items-center gap-3">
                  {expanded === group.hash ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  <span className="font-semibold">{group.count} artigos duplicados</span>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">Hash: {group.hash.slice(0, 12)}...</span>
                </div>
              </button>
              {expanded === group.hash && (
                <div className="mt-4 pl-8 space-y-2 border-l-2 border-border">
                  {group.articles.map((article) => (
                    <div key={article.id} className="text-sm p-2 bg-muted/50 rounded">{article.title}</div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </MainLayout>
  );
}
