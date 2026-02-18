import { useMemo, useState } from 'react';
import { ChevronDown, Loader2, RefreshCcw, RefreshCw, ShieldAlert } from 'lucide-react';

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
import { Badge } from '@/components/ui/badge';
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
import { hasRole } from '@/services/auth.service';
import type { NeedItem } from '@/types';
import type { NeedStatusActionRequest, NeedTriageRequest, NeedsTeamMetricsItem } from '@/types/needs-enterprise';

type NeedActionType = 'start' | 'block' | 'complete' | 'cancel';

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

const resolveTeamMetricValue = (team: NeedsTeamMetricsItem, field: 'open' | 'overdue' | 'criticalOpen') => {
  if (field === 'open') return team.open ?? team.openTotal ?? 0;
  if (field === 'overdue') return team.overdue ?? team.overdueTotal ?? 0;
  return team.criticalOpen ?? team.criticalTotal ?? 0;
};

export default function NeedsPage() {
  const isManager = hasRole(['ADMIN', 'MANAGER']);
  const [selectedTeamId, setSelectedTeamId] = useState<string | number | null>(null);
  const [triageNeedId, setTriageNeedId] = useState<number | null>(null);
  const [historyNeedId, setHistoryNeedId] = useState<number | null>(null);
  const [detailNeedId, setDetailNeedId] = useState<number | null>(null);
  const [actionModal, setActionModal] = useState<ActionModalState | null>(null);

  const needsQuery = useNeedsList(selectedTeamId);
  const metricsQuery = useNeedMetricsSummary();
  const debugQuery = useNeedsDebugCountsQuery(isManager);
  const teamMetricsQuery = useNeedsMetricsByTeamQuery(isManager);

  const { triageMutation, startMutation, blockMutation, completeMutation, cancelMutation } = useNeedMutations();
  const runSupportImportMutation = useRunSupportImportMutation();
  const generateDemoMutation = useGenerateNeedsDemoMutation();

  const handleReload = async () => {
    await Promise.all([
      needsQuery.refetch(),
      metricsQuery.refetch(),
      ...(isManager ? [debugQuery.refetch(), teamMetricsQuery.refetch()] : []),
    ]);
  };

  const handleViewNeedsByTeam = (teamId: string | number) => {
    setSelectedTeamId(teamId);
    toast({
      title: 'Filtro por equipe aplicado',
      description: 'A aba Geral foi filtrada para a equipe selecionada.',
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
          <Button
            type="button"
            onClick={() => runSupportImportMutation.mutate()}
            disabled={runSupportImportMutation.isPending}
          >
            {runSupportImportMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="mr-2 h-4 w-4" />
            )}
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

      <Tabs defaultValue="geral" className="space-y-6">
        <TabsList>
          <TabsTrigger value="geral">Geral</TabsTrigger>
          {isManager ? <TabsTrigger value="equipe">Por equipe</TabsTrigger> : null}
        </TabsList>

        <TabsContent value="geral" className="space-y-6">
          <NeedsMetricsCards data={metricsQuery.data} isLoading={metricsQuery.isLoading} />

          {isManager ? (
            <Collapsible className="rounded-lg border">
              <CollapsibleTrigger asChild>
                <Button type="button" variant="ghost" className="w-full justify-start rounded-none">
                  Ver diagnóstico
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 p-4 pt-0">
                {debugQuery.isError ? (
                  <Alert variant="destructive">
                    <ShieldAlert className="h-4 w-4" />
                    <AlertTitle>Falha ao carregar diagnóstico</AlertTitle>
                    <AlertDescription>Tente recarregar a página para buscar os dados novamente.</AlertDescription>
                  </Alert>
                ) : null}

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Card><CardHeader><CardTitle className="text-sm">rulesActive</CardTitle></CardHeader><CardContent>{debugQuery.data?.rulesActive ?? 0}</CardContent></Card>
                  <Card><CardHeader><CardTitle className="text-sm">clusters</CardTitle></CardHeader><CardContent>{debugQuery.data?.clusters ?? 0}</CardContent></Card>
                  <Card><CardHeader><CardTitle className="text-sm">tickets</CardTitle></CardHeader><CardContent>{debugQuery.data?.tickets ?? 0}</CardContent></Card>
                  <Card><CardHeader><CardTitle className="text-sm">ticketsWithoutAssignee</CardTitle></CardHeader><CardContent>{debugQuery.data?.ticketsWithoutAssignee ?? 0}</CardContent></Card>
                  <Card><CardHeader><CardTitle className="text-sm">needsTotal</CardTitle></CardHeader><CardContent>{debugQuery.data?.needsTotal ?? 0}</CardContent></Card>
                  <Card><CardHeader><CardTitle className="text-sm">minOriginCreatedAt</CardTitle></CardHeader><CardContent>{formatDate(debugQuery.data?.minOriginCreatedAt ?? null)}</CardContent></Card>
                  <Card><CardHeader><CardTitle className="text-sm">maxOriginCreatedAt</CardTitle></CardHeader><CardContent>{formatDate(debugQuery.data?.maxOriginCreatedAt ?? null)}</CardContent></Card>
                </div>

                {(debugQuery.data?.ticketsWithoutAssignee ?? 0) > 0 ? (
                  <Badge variant="destructive">Tickets sem responsável detectados.</Badge>
                ) : null}

                {(debugQuery.data?.needsTotal ?? 0) === 0 ? (
                  <Alert>
                    <ShieldAlert className="h-4 w-4" />
                    <AlertTitle>Nenhuma necessidade foi gerada.</AlertTitle>
                    <AlertDescription>
                      Possíveis motivos:
                      <ul className="mt-2 list-inside list-disc">
                        <li>Não há tickets dentro da janela da regra.</li>
                        <li>Dados históricos antigos.</li>
                        <li>Sem responsável vinculado.</li>
                      </ul>
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
                  ? 'Clique em “Atualizar dados do suporte” para recalcular recorrências. Consulte o diagnóstico abaixo para entender o motivo.'
                  : 'Solicite a um administrador a atualização dos dados.'
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

          {isManager && showRuleMismatchHint ? (
            <Alert>
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle>Os dados indicam regras ativas sem necessidades geradas.</AlertTitle>
              <AlertDescription>Verifique o painel de diagnóstico para validar janela de dados e responsáveis.</AlertDescription>
            </Alert>
          ) : null}
        </TabsContent>

        {isManager ? (
          <TabsContent value="equipe">
            {teamMetricsQuery.isError ? (
              <EmptyState
                title="Falha ao carregar métricas por equipe."
                description="Não foi possível obter os dados da API. Tente novamente."
                action={{ label: 'Recarregar', onClick: handleReload }}
              />
            ) : teamMetricsQuery.isLoading ? (
              <div className="grid gap-4 md:grid-cols-2">
                <Skeleton className="h-44 w-full" />
                <Skeleton className="h-44 w-full" />
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {(teamMetricsQuery.data ?? []).map((team) => (
                  <Card key={String(team.teamId)}>
                    <CardHeader>
                      <CardTitle>{team.teamName}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <p>open: <strong>{resolveTeamMetricValue(team, 'open')}</strong></p>
                      <p>triaged: <strong>{team.triaged ?? 0}</strong></p>
                      <p>inProgress: <strong>{team.inProgress ?? 0}</strong></p>
                      <p>blocked: <strong>{team.blocked ?? 0}</strong></p>
                      <p>overdue: <strong>{resolveTeamMetricValue(team, 'overdue')}</strong></p>
                      <p>criticalOpen: <strong>{resolveTeamMetricValue(team, 'criticalOpen')}</strong></p>
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
        ) : null}
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
