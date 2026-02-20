import { Loader2 } from 'lucide-react';

import { NeedSeverityBadge } from '@/components/needs/NeedSeverityBadge';
import { NeedStatusBadge } from '@/components/needs/NeedStatusBadge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { NeedItem } from '@/types';

type NeedActionType = 'start' | 'block' | 'complete' | 'cancel';

interface NeedsListProps {
  needs: NeedItem[];
  total: number;
  isActionLoading?: boolean;
  onTriage: (needId: number) => void;
  onAction: (type: NeedActionType, needId: number) => void;
  onOpenDetail: (needId: number) => void;
  onOpenHistory: (needId: number) => void;
}

const parseNeedId = (need: NeedItem): number | null => {
  const parsed = Number(need.id);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
};

const canTriage = (status?: string | null) => {
  const normalized = (status ?? '').toUpperCase();
  return normalized === 'CREATED' || normalized === '';
};

const getAvailableActions = (status?: string | null): NeedActionType[] => {
  const normalized = (status ?? '').toUpperCase();

  if (normalized === 'TRIAGED') return ['start', 'cancel'];
  if (normalized === 'IN_PROGRESS') return ['block', 'complete', 'cancel'];
  if (normalized === 'BLOCKED') return ['start', 'cancel'];
  return [];
};

const ACTION_LABELS: Record<NeedActionType, string> = {
  start: 'Iniciar',
  block: 'Bloquear',
  complete: 'Concluir',
  cancel: 'Cancelar',
};

export const NeedsList = ({ needs, total, isActionLoading = false, onTriage, onAction, onOpenDetail, onOpenHistory }: NeedsListProps) => {
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
                  <TableCell>
                    <NeedStatusBadge status={need.status} />
                  </TableCell>
                  <TableCell>
                    <NeedSeverityBadge severity={need.severity} />
                  </TableCell>
                  <TableCell className="space-x-2 text-right">
                    {canTriage(need.status) ? (
                      <Button size="sm" variant="default" disabled={!needId || isActionLoading} onClick={() => needId && onTriage(needId)}>
                        {isActionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Triar
                      </Button>
                    ) : null}

                    {getAvailableActions(need.status).map((actionType) => (
                      <Button
                        key={`${need.id}-${actionType}`}
                        size="sm"
                        variant={actionType === 'cancel' ? 'destructive' : 'outline'}
                        disabled={!needId || isActionLoading}
                        onClick={() => needId && onAction(actionType, needId)}
                      >
                        {isActionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {ACTION_LABELS[actionType]}
                      </Button>
                    ))}

                    <Button size="sm" variant="outline" disabled={!needId || isActionLoading} onClick={() => needId && onOpenDetail(needId)}>
                      Detalhes
                    </Button>
                    <Button size="sm" variant="outline" disabled={!needId || isActionLoading} onClick={() => needId && onOpenHistory(needId)}>
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
