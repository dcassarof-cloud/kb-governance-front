import { useMemo, useState } from 'react';
import { RefreshCcw, RefreshCw } from 'lucide-react';

import { MainLayout } from '@/components/layout/MainLayout';
import { NeedActionDialog } from '@/components/needs/NeedActionDialog';
import { NeedDetailDialog } from '@/components/needs/NeedDetailDialog';
import { NeedHistoryDrawer } from '@/components/needs/NeedHistoryDrawer';
import { NeedSeverityBadge } from '@/components/needs/NeedSeverityBadge';
import { NeedStatusBadge } from '@/components/needs/NeedStatusBadge';
import { NeedTriageDialog } from '@/components/needs/NeedTriageDialog';
import { NeedsMetricsCards } from '@/components/needs/NeedsMetricsCards';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useNeedMetricsSummary, useNeedMutations, useNeedsList, useRunSupportImportMutation } from '@/hooks/useNeedsEnterprise';
import type { NeedItem } from '@/types';
import { hasRole } from '@/services/auth.service';
import type { NeedStatusActionRequest, NeedTriageRequest } from '@/types/needs-enterprise';

type NeedActionType = 'start' | 'block' | 'complete' | 'cancel';

interface ActionModalState {
  type: NeedActionType;
  needId: number;
}

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString('pt-BR');
};

const parseNeedId = (need: NeedItem): number | null => {
  const parsed = Number(need.id);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
};

// Regras de workflow tolerantes a contratos antigos e status desconhecidos.
const resolveActions = (status?: string | null): Array<'triage' | NeedActionType | 'history'> => {
  const normalized = (status ?? '').toUpperCase();

  if (!normalized || ['RECURRING', 'OPERATIONAL', 'CREATED'].includes(normalized)) {
    return ['triage', 'history'];
  }

  if (normalized === 'TRIAGED') return ['start', 'cancel', 'history'];
  if (normalized === 'IN_PROGRESS') return ['block', 'complete', 'history'];
  if (normalized === 'BLOCKED') return ['start', 'cancel', 'history'];
  if (['DONE', 'CANCELLED'].includes(normalized)) return ['history'];

  return ['triage', 'history'];
};

export default function NeedsPage() {
  const needsQuery = useNeedsList();
  const metricsQuery = useNeedMetricsSummary();
  const { triageMutation, startMutation, blockMutation, completeMutation, cancelMutation } = useNeedMutations();
  const runSupportImportMutation = useRunSupportImportMutation();
  const canRunSupportImport = hasRole(['ADMIN', 'MANAGER']);

  const [triageNeedId, setTriageNeedId] = useState<number | null>(null);
  const [historyNeedId, setHistoryNeedId] = useState<number | null>(null);
  const [detailNeedId, setDetailNeedId] = useState<number | null>(null);
  const [actionModal, setActionModal] = useState<ActionModalState | null>(null);

  const handleReload = async () => {
    await Promise.all([needsQuery.refetch(), metricsQuery.refetch()]);
  };

  const handleTriage = async (needId: number, body: NeedTriageRequest) => {
    await triageMutation.mutateAsync({ needId, body });
  };

  const handleAction = async (type: NeedActionType, needId: number, body: NeedStatusActionRequest) => {
    if (type === 'start') return startMutation.mutateAsync({ needId, body });
    if (type === 'block') return blockMutation.mutateAsync({ needId, body });
    if (type === 'complete') return completeMutation.mutateAsync({ needId, body });
    return cancelMutation.mutateAsync({ needId, body });
  };

  const isAnyActionLoading =
    triageMutation.isPending ||
    startMutation.isPending ||
    blockMutation.isPending ||
    completeMutation.isPending ||
    cancelMutation.isPending;

  const tableRows = useMemo(() => needsQuery.data?.data ?? [], [needsQuery.data]);

  return (
    <MainLayout>
      <PageHeader title="Necessidades" description="Workflow • SLA • Auditoria" />

      <div className="mb-4 flex items-center justify-end gap-2">
        {canRunSupportImport ? (
          <Button type="button" onClick={() => runSupportImportMutation.mutate()} disabled={runSupportImportMutation.isPending}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            {runSupportImportMutation.isPending ? 'Atualizando…' : 'Atualizar dados do suporte'}
          </Button>
        ) : null}

        <Button
          type="button"
          variant="outline"
          onClick={handleReload}
          disabled={needsQuery.isFetching || metricsQuery.isFetching || runSupportImportMutation.isPending}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Recarregar
        </Button>
      </div>

      <div className="mb-6">
        <NeedsMetricsCards data={metricsQuery.data} isLoading={metricsQuery.isLoading} />
      </div>

      {needsQuery.isError || metricsQuery.isError ? (
        <EmptyState
          title={needsQuery.isError ? 'Falha ao carregar necessidades.' : 'Falha ao carregar métricas.'}
          description="Não foi possível obter os dados da API. Tente novamente."
          action={{ label: 'Recarregar', onClick: handleReload }}
        />
      ) : needsQuery.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : !tableRows.length ? (
        <EmptyState
          title="Nenhuma necessidade encontrada."
          description={
            canRunSupportImport
              ? "Dica: clique em ‘Atualizar dados do suporte’ para importar e gerar necessidades."
              : 'Peça para um administrador atualizar os dados do suporte.'
          }
          action={{ label: 'Recarregar', onClick: handleReload }}
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Resumo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Severidade</TableHead>
                <TableHead>Due At</TableHead>
                <TableHead>Priority Score</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableRows.map((need) => {
                const availableActions = resolveActions(need.status);
                const needId = parseNeedId(need);

                return (
                  <TableRow key={need.id}>
                    <TableCell>{need.id}</TableCell>
                    <TableCell>{need.summary || need.subject || '—'}</TableCell>
                    <TableCell>
                      <NeedStatusBadge status={need.status} />
                    </TableCell>
                    <TableCell>
                      <NeedSeverityBadge severity={need.severity ?? null} />
                    </TableCell>
                    <TableCell>{formatDate(need.dueAt)}</TableCell>
                    <TableCell>{need.priorityScore ?? '—'}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button size="sm" variant="outline" disabled={!needId} onClick={() => setDetailNeedId(needId)}>
                          Detalhes
                        </Button>

                        {availableActions.includes('triage') ? (
                          <Button size="sm" variant="secondary" disabled={!needId} onClick={() => setTriageNeedId(needId)}>
                            Triar
                          </Button>
                        ) : null}

                        {availableActions.includes('start') ? (
                          <Button size="sm" variant="secondary" disabled={!needId} onClick={() => needId && setActionModal({ type: 'start', needId })}>
                            Iniciar
                          </Button>
                        ) : null}

                        {availableActions.includes('block') ? (
                          <Button size="sm" variant="secondary" disabled={!needId} onClick={() => needId && setActionModal({ type: 'block', needId })}>
                            Bloquear
                          </Button>
                        ) : null}

                        {availableActions.includes('complete') ? (
                          <Button size="sm" variant="secondary" disabled={!needId} onClick={() => needId && setActionModal({ type: 'complete', needId })}>
                            Concluir
                          </Button>
                        ) : null}

                        {availableActions.includes('cancel') ? (
                          <Button size="sm" variant="secondary" disabled={!needId} onClick={() => needId && setActionModal({ type: 'cancel', needId })}>
                            Cancelar
                          </Button>
                        ) : null}

                        <Button size="sm" variant="outline" disabled={!needId} onClick={() => setHistoryNeedId(needId)}>
                          Histórico
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <NeedDetailDialog
        open={Boolean(detailNeedId)}
        onOpenChange={(open) => {
          if (!open) setDetailNeedId(null);
        }}
        needId={detailNeedId}
      />

      <NeedTriageDialog
        open={Boolean(triageNeedId)}
        onOpenChange={(open) => {
          if (!open) setTriageNeedId(null);
        }}
        needId={triageNeedId}
        onConfirm={handleTriage}
        isLoading={isAnyActionLoading}
      />

      <NeedActionDialog
        open={Boolean(actionModal)}
        onOpenChange={(open) => {
          if (!open) setActionModal(null);
        }}
        actionType={actionModal?.type ?? 'start'}
        needId={actionModal?.needId}
        onConfirm={handleAction}
        isLoading={isAnyActionLoading}
      />

      <NeedHistoryDrawer
        open={Boolean(historyNeedId)}
        onOpenChange={(open) => {
          if (!open) setHistoryNeedId(null);
        }}
        needId={historyNeedId}
      />
    </MainLayout>
  );
}
