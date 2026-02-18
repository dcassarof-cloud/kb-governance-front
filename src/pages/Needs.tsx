import { useMemo, useState } from 'react';
import { ChevronDown, RefreshCcw, RefreshCw, ShieldAlert } from 'lucide-react';

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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useGenerateNeedsDemoMutation,
  useNeedMetricsSummary,
  useNeedMutations,
  useNeedsDebugCountsQuery,
  useNeedsList,
  useNeedsMetricsByTeamQuery,
  useRunSupportImportMutation,
} from '@/hooks/useNeedsEnterprise';
import { toast } from '@/hooks/use-toast';
import type { NeedItem } from '@/types';
import { hasRole } from '@/services/auth.service';
import type { NeedStatusActionRequest, NeedTriageRequest } from '@/types/needs-enterprise';

type NeedActionType = 'start' | 'block' | 'complete' | 'cancel';
type NeedsView = 'general' | 'byTeam';

interface ActionModalState {
  type: NeedActionType;
  needId: number;
}

const DEMO_GENERATE_ENABLED = ((import.meta.env.VITE_NEEDS_DEMO_ENABLED ?? 'false').toLowerCase() === 'true');

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
  const isManager = hasRole(['ADMIN', 'MANAGER']);
  const [selectedTeamId, setSelectedTeamId] = useState<string | number | null>(null);
  const [currentView, setCurrentView] = useState<NeedsView>('general');

  const needsQuery = useNeedsList(selectedTeamId);
  const metricsQuery = useNeedMetricsSummary();
  const debugQuery = useNeedsDebugCountsQuery(isManager);
  const teamMetricsQuery = useNeedsMetricsByTeamQuery(isManager);

  const { triageMutation, startMutation, blockMutation, completeMutation, cancelMutation } = useNeedMutations();
  const runSupportImportMutation = useRunSupportImportMutation();
  const generateDemoMutation = useGenerateNeedsDemoMutation();

  const [triageNeedId, setTriageNeedId] = useState<number | null>(null);
  const [historyNeedId, setHistoryNeedId] = useState<number | null>(null);
  const [detailNeedId, setDetailNeedId] = useState<number | null>(null);
  const [actionModal, setActionModal] = useState<ActionModalState | null>(null);

  const handleReload = async () => {
    await Promise.all([
      needsQuery.refetch(),
      metricsQuery.refetch(),
      ...(isManager ? [debugQuery.refetch(), teamMetricsQuery.refetch()] : []),
    ]);
  };

  const handleViewNeedsByTeam = (teamId: string | number) => {
    setSelectedTeamId(teamId);
    setCurrentView('general');
    toast({
      title: 'Filtro por equipe aplicado',
      description: 'Se não houver retorno, o backend pode ainda estar com filtro por equipe em implementação.',
    });
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

  const isHeaderLoading =
    needsQuery.isFetching ||
    metricsQuery.isFetching ||
    runSupportImportMutation.isPending ||
    generateDemoMutation.isPending;

  const tableRows = useMemo(() => needsQuery.data?.data ?? [], [needsQuery.data]);

  const showRuleMismatchHint =
    (debugQuery.data?.rulesActive ?? 0) > 0 &&
    (debugQuery.data?.clusters ?? 0) > 0 &&
    (debugQuery.data?.tickets ?? 0) > 0 &&
    (debugQuery.data?.needsTotal ?? 0) === 0;

  return (
    <MainLayout>
      <PageHeader title="Necessidades" description="Workflow • SLA • Auditoria" />

      <div className="mb-4 flex items-center justify-end gap-2">
        <Button type="button" variant="outline" onClick={handleReload} disabled={isHeaderLoading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Recarregar
        </Button>

        {isManager ? (
          <Button type="button" onClick={() => runSupportImportMutation.mutate()} disabled={runSupportImportMutation.isPending}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            {runSupportImportMutation.isPending ? 'Atualizando…' : 'Atualizar dados do suporte'}
          </Button>
        ) : null}

        {isManager && DEMO_GENERATE_ENABLED ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" disabled={generateDemoMutation.isPending}>
                Mais
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => generateDemoMutation.mutate(10)}>
                Gerar dados de demo
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>

      <Tabs value={currentView} onValueChange={(value) => setCurrentView(value as NeedsView)}>
        <TabsList>
          <TabsTrigger value="general">Geral</TabsTrigger>
          <TabsTrigger value="byTeam">Por equipe</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <NeedsMetricsCards data={metricsQuery.data} isLoading={metricsQuery.isLoading} />

          {isManager ? (
            <Collapsible className="rounded-lg border">
              <CollapsibleTrigger asChild>
                <Button type="button" variant="ghost" className="w-full justify-start rounded-none">
                  Detalhes de diagnóstico
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 p-4 pt-0">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  <Card><CardHeader><CardTitle className="text-sm">Regras ativas</CardTitle></CardHeader><CardContent>{debugQuery.data?.rulesActive ?? 0}</CardContent></Card>
                  <Card><CardHeader><CardTitle className="text-sm">Clusters</CardTitle></CardHeader><CardContent>{debugQuery.data?.clusters ?? 0}</CardContent></Card>
                  <Card><CardHeader><CardTitle className="text-sm">Tickets</CardTitle></CardHeader><CardContent>{debugQuery.data?.tickets ?? 0}</CardContent></Card>
                  <Card><CardHeader><CardTitle className="text-sm">Needs total</CardTitle></CardHeader><CardContent>{debugQuery.data?.needsTotal ?? 0}</CardContent></Card>
                  <Card><CardHeader><CardTitle className="text-sm">Sem responsável</CardTitle></CardHeader><CardContent>{debugQuery.data?.ticketsWithoutAssignee ?? 0}</CardContent></Card>
                </div>

                {(debugQuery.data?.needsTotal ?? 0) === 0 ? (
                  <Alert>
                    <ShieldAlert className="h-4 w-4" />
                    <AlertTitle>Motivo provável: regras não bateram / cooldown / sem responsável.</AlertTitle>
                    <AlertDescription>
                      Ação: clique em <strong>Atualizar dados do suporte</strong>. Plano B: gerar demo (se habilitado).
                    </AlertDescription>
                  </Alert>
                ) : null}
              </CollapsibleContent>
            </Collapsible>
          ) : null}

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
                isManager
                  ? showRuleMismatchHint
                    ? 'As regras não bateram. Veja o diagnóstico.'
                    : 'Clique em ‘Atualizar dados do suporte’ para importar e recalcular recorrências.'
                  : 'Peça para um ADMIN/MANAGER atualizar os dados do suporte.'
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
                        <TableCell><NeedStatusBadge status={need.status} /></TableCell>
                        <TableCell><NeedSeverityBadge severity={need.severity ?? null} /></TableCell>
                        <TableCell>{formatDate(need.dueAt)}</TableCell>
                        <TableCell>{need.priorityScore ?? '—'}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap justify-end gap-2">
                            <Button size="sm" variant="outline" disabled={!needId} onClick={() => setDetailNeedId(needId)}>Detalhes</Button>
                            {availableActions.includes('triage') ? <Button size="sm" variant="secondary" disabled={!needId} onClick={() => setTriageNeedId(needId)}>Triar</Button> : null}
                            {availableActions.includes('start') ? <Button size="sm" variant="secondary" disabled={!needId} onClick={() => needId && setActionModal({ type: 'start', needId })}>Iniciar</Button> : null}
                            {availableActions.includes('block') ? <Button size="sm" variant="secondary" disabled={!needId} onClick={() => needId && setActionModal({ type: 'block', needId })}>Bloquear</Button> : null}
                            {availableActions.includes('complete') ? <Button size="sm" variant="secondary" disabled={!needId} onClick={() => needId && setActionModal({ type: 'complete', needId })}>Concluir</Button> : null}
                            {availableActions.includes('cancel') ? <Button size="sm" variant="secondary" disabled={!needId} onClick={() => needId && setActionModal({ type: 'cancel', needId })}>Cancelar</Button> : null}
                            <Button size="sm" variant="outline" disabled={!needId} onClick={() => setHistoryNeedId(needId)}>Histórico</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="byTeam">
          {teamMetricsQuery.isError ? (
            <EmptyState
              title="Falha ao carregar métricas por equipe."
              description="Não foi possível obter os dados da API. Tente novamente."
              action={{ label: 'Recarregar', onClick: handleReload }}
            />
          ) : teamMetricsQuery.isLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-36 w-full" />
              <Skeleton className="h-36 w-full" />
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {(teamMetricsQuery.data ?? []).map((team) => (
                <Card key={String(team.teamId)}>
                  <CardHeader>
                    <CardTitle>{team.teamName}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p>Total de necessidades: <strong>{team.needsTotal}</strong></p>
                    <p>Em aberto: <strong>{team.openTotal}</strong></p>
                    <p>Vencidas: <strong>{team.overdueTotal}</strong></p>
                    <p>Críticas: <strong>{team.criticalTotal}</strong></p>
                    <Button type="button" variant="outline" onClick={() => void handleViewNeedsByTeam(team.teamId)}>
                      Ver necessidades
                    </Button>
                  </CardContent>
                </Card>
              ))}
              {(teamMetricsQuery.data ?? []).length === 0 ? (
                <EmptyState
                  title="Nenhuma equipe encontrada."
                  description="As métricas por equipe ainda não retornaram resultados."
                  action={{ label: 'Recarregar', onClick: handleReload }}
                  className="col-span-full"
                />
              ) : null}
            </div>
          )}
        </TabsContent>
      </Tabs>

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
