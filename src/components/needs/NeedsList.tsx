import { NeedSeverityBadge } from '@/components/needs/NeedSeverityBadge';
import { NeedStatusBadge } from '@/components/needs/NeedStatusBadge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { NeedItem } from '@/types';

interface NeedsListProps {
  needs: NeedItem[];
  total: number;
  onOpenDetail: (needId: number) => void;
  onOpenHistory: (needId: number) => void;
}

const parseNeedId = (need: NeedItem): number | null => {
  const parsed = Number(need.id);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
};

export const NeedsList = ({ needs, total, onOpenDetail, onOpenHistory }: NeedsListProps) => {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{total} resultado(s)</p>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Equipe</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Severidade</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {needs.map((need) => {
              const needId = parseNeedId(need);
              return (
                <TableRow key={need.id}>
                  <TableCell>{need.subject || need.summary || 'Sem título'}</TableCell>
                  <TableCell>{need.teamName || '—'}</TableCell>
                  <TableCell><NeedStatusBadge status={need.status} /></TableCell>
                  <TableCell><NeedSeverityBadge severity={need.severity} /></TableCell>
                  <TableCell className="space-x-2 text-right">
                    <Button size="sm" variant="outline" disabled={!needId} onClick={() => needId && onOpenDetail(needId)}>
                      Detalhes
                    </Button>
                    <Button size="sm" variant="outline" disabled={!needId} onClick={() => needId && onOpenHistory(needId)}>
                      Histórico
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
