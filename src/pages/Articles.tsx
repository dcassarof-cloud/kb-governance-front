import { useEffect, useState } from 'react';
import { ExternalLink, Search } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { articlesService } from '@/services/articles.service';
import { KbArticle, PaginatedResponse } from '@/types';

export default function ArticlesPage() {
  const [data, setData] = useState<PaginatedResponse<KbArticle> | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    articlesService.getArticles({ q: search }).then((result) => {
      setData(result);
      setLoading(false);
    });
  }, [search]);

  return (
    <MainLayout>
      <PageHeader title="Manuais" description="Gerencie os artigos da base de conhecimento" />
      
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar manuais..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton variant="table" rows={5} />
      ) : !data?.data.length ? (
        <EmptyState title="Nenhum manual encontrado" description="Tente ajustar os filtros de busca" />
      ) : (
        <div className="table-container overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-4 font-semibold text-sm">Título</th>
                <th className="text-left p-4 font-semibold text-sm">Sistema</th>
                <th className="text-left p-4 font-semibold text-sm">Status</th>
                <th className="text-left p-4 font-semibold text-sm">Atualizado</th>
                <th className="text-left p-4 font-semibold text-sm">Ações</th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((article) => (
                <tr key={article.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                  <td className="p-4 font-medium">{article.title}</td>
                  <td className="p-4 text-muted-foreground">{article.systemCode}</td>
                  <td className="p-4"><StatusBadge status={article.governanceStatus} /></td>
                  <td className="p-4 text-muted-foreground text-sm">{new Date(article.updatedDate).toLocaleDateString('pt-BR')}</td>
                  <td className="p-4">
                    <Button variant="ghost" size="sm" asChild>
                      <a href={article.manualLink} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </MainLayout>
  );
}
