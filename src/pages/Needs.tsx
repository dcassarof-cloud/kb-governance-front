import { useMemo, useState } from 'react';
import { Loader2, RefreshCcw } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

import { MainLayout } from '@/components/layout/MainLayout';
import { NeedActionDialog } from '@/components/needs/NeedActionDialog';
import { NeedDetailsDrawer } from '@/components/needs/NeedDetailsDrawer';
import { NeedTriageDialog } from '@/components/needs/NeedTriageDialog';
import { NeedsEmptyState } from '@/components/needs/NeedsEmptyState';
import { NeedsFilters } from '@/components/needs/NeedsFilters';
import { NeedsList } from '@/components/needs/NeedsList';
import { NeedsMetricsCards } from '@/components/needs/NeedsMetricsCards';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useNeedMetricsSummary,
  useNeedMutations,
  useNeedsList,
  useNeedsMetricsByTeamQuery,
  useRunSupportImportMutation,
} from '@/hooks/useNeedsEnterprise';
import { formatApiErrorInfo, toApiErrorInfo } from '@/lib/api-error-info';
import type { NeedItem } from '@/types';
import type { NeedStatusActionRequest, NeedTriageRequest } from '@/types/needs-enterprise';

type NeedActionType = 'start' | 'block' | 'complete' | 'cancel';

interface ActionModalState {
  type: NeedActionType;
  needId: number;
}

const getTeamFromUrl = (searchParams: URLSearchParams) => searchParams.get('teamId') ?? 'all';

const teamMatches = (need: NeedItem, selectedTeamId: string) => {
  if (selectedTeamId === 'all') return true;
  return String(need.teamId ?? '') === selectedTeamId;
};

export default function NeedsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedTeamId = getTeamFromUrl(searchParams);

  const [triageNeedId, setTriageNeedId] = useState<number | null>(null);
  const [detailNeedId, setDetailNeedId] = useState<number | null>(null);
  const [actionModal, setActionModal] = useState<ActionModalState | null>(null);

  const needsQuery = useNeedsList({ teamId: selectedTeamId === 'all' ? null : selectedTeamId });
  const metricsQuery = useNeedMetricsSummary();
  const teamMetricsQuery = useNeedsMetricsByTeamQuery();

  const { triageMutation, startMutation, blockMutation, completeMutation, cancelMutation } = useNeedMutations();
  const runSupportImportMutation = useRunSupportImportMutation();

  const needsData = needsQuery.data?.payload.data ?? [];
  const teamFilterAvailable = needsData.length === 0 || needsData.some((need) => need.teamId || need.teamName);

  const filteredNeeds = useMemo(() => {
    if (selectedTeamId === 'all') return needsData;

    if (teamFilterAvailable) {
      return needsData.filter((need) => teamMatches(need, selectedTeamId));
    }

    console.error('[needs] Filtro por equipe indisponível: payload sem teamId/teamName', needsData);
    return needsData;
  }, [needsData, selectedTeamId, teamFilterAvailable]);

  const handleReload = async () => {
    await Promise.all([needsQuery.refetch(), metricsQuery.refetch(), teamMetricsQuery.refetch()]);
  };

  const handleTriage = async (needId: number, body: NeedTriageRequest) => {
    await triageMutation.mutateAsync({ needId, body });
  };

  const handleAction = async (type: NeedActionType, needId: number, body: NeedStatusActionRequest) => {
    if (type === 'start') await startMutation.mutateAsync({ needId, body });
    if (type === 'block') await blockMutation.mutateAsync({ needId, body });
    if (type === 'complete') await completeMutation.mutateAsync({ needId, body });
    if (type === 'cancel') await cancelMutation.mutateAsync({ needId, body });
    setActionModal(null);
  };

  const needsErrorInfo = needsQuery.isError ? toApiErrorInfo(needsQuery.error, 'Falha ao carregar necessidades.') : null;

  const isAnyActionLoading =
    triageMutation.isPending ||
    startMutation.isPending ||
    blockMutation.isPending ||
    completeMutation.isPending ||
    cancelMutation.isPending ||
    runSupportImportMutation.isPending;

  return (
    <MainLayout>
      <PageHeader
        title="Necessidades"
        description="Acompanhe necessidades recorrentes e operacionais de forma estruturada."
        actions={
          <Button type="button" variant="outline" onClick={() => runSupportImportMutation.mutate()} disabled={runSupportImportMutation.isPending}>
            {runSupportImportMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
            {runSupportImportMutation.isPending ? 'Atualizando…' : 'Atualizar dados do suporte'}
          </Button>
        }
      />

      <div className="space-y-6">
        <NeedsMetricsCards data={metricsQuery.data} isLoading={metricsQuery.isLoading} isError={metricsQuery.isError} />

        <NeedsFilters
          teamMetrics={teamMetricsQuery.data ?? []}
          selectedTeamId={selectedTeamId}
          onTeamChange={(teamId) => {
            const next = new URLSearchParams(searchParams);
            if (teamId === 'all') next.delete('teamId');
            else next.set('teamId', teamId);
            setSearchParams(next, { replace: true });
          }}
          teamFilterAvailable={teamFilterAvailable}
        />

        {needsQuery.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : needsQuery.isError ? (
          <NeedsEmptyState
            title="Falha ao carregar necessidades"
            description={formatApiErrorInfo(needsErrorInfo ?? { message: 'Não foi possível carregar necessidades.' })}
            onReload={handleReload}
          />
        ) : filteredNeeds.length === 0 ? (
          <NeedsEmptyState
            title="Nenhuma necessidade encontrada"
            description="Ajuste os filtros e recarregue para tentar novamente."
            onReload={handleReload}
          />
        ) : (
          <NeedsList needs={filteredNeeds} total={filteredNeeds.length} onOpenDetail={setDetailNeedId} onOpenHistory={setDetailNeedId} />
        )}
      </div>

      <NeedDetailsDrawer
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
    </MainLayout>
  );
}
