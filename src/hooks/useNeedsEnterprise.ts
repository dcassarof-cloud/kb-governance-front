import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { toast } from '@/hooks/use-toast';
import { formatApiErrorInfo, toApiErrorInfo } from '@/lib/api-error-info';
import { toApiError } from '@/lib/handle-api-error';
import {
  blockNeed,
  cancelNeed,
  completeNeed,
  getNeedMetricsSummary,
  getNeedsMetricsByTeam,
  needsService,
  runSupportImport,
  startNeed,
  triageNeed,
} from '@/services/needs.service';
import { NeedStatusActionRequest, NeedTriageRequest } from '@/types/needs-enterprise';

export interface NeedsListFilters {
  teamId?: number | string | null;
  systemCode?: string | null;
  q?: string | null;
}

export const NEEDS_QUERY_KEYS = {
  list: ['needs.list'] as const,
  metricsSummary: ['needs.metrics.summary'] as const,
  metricsByTeam: ['needs.metrics.byTeam'] as const,
  detail: (needId?: number | null) => ['needs.detail', needId ?? null] as const,
  history: (needId?: number | null) => ['needs.history', needId ?? null] as const,
};

export const useNeedsList = (filters: NeedsListFilters) =>
  useQuery({
    queryKey: [...NEEDS_QUERY_KEYS.list, { teamId: filters.teamId ?? null, systemCode: filters.systemCode ?? null, q: filters.q ?? null }],
    queryFn: () =>
      needsService.listNeedsWithMeta({
        page: 1,
        size: 100,
        teamId: filters.teamId ?? undefined,
        systemCode: filters.systemCode ?? undefined,
      }),
    retry: false,
  });

export const useNeedMetricsSummary = () =>
  useQuery({
    queryKey: NEEDS_QUERY_KEYS.metricsSummary,
    queryFn: getNeedMetricsSummary,
    retry: false,
  });

export const useNeedsMetricsByTeamQuery = () =>
  useQuery({
    queryKey: NEEDS_QUERY_KEYS.metricsByTeam,
    queryFn: getNeedsMetricsByTeam,
    retry: false,
  });

export const useNeedHistory = (needId?: number | null, enabled = true) =>
  useQuery({
    queryKey: NEEDS_QUERY_KEYS.history(needId),
    queryFn: () => needsService.getNeedHistory(needId as number),
    enabled: enabled && !!needId,
    retry: false,
  });

export const useNeedDetail = (needId?: number | null, enabled = true) =>
  useQuery({
    queryKey: NEEDS_QUERY_KEYS.detail(needId),
    queryFn: () => needsService.getNeed(String(needId)),
    enabled: enabled && !!needId,
    retry: false,
  });

const showMutationError = (error: unknown) => {
  const info = toApiErrorInfo(error, 'Não foi possível concluir a ação desta necessidade.');
  toast({
    title: 'Falha ao processar ação',
    description: info.message,
    variant: 'destructive',
  });
};

const resolveSupportImportErrorMessage = (error: unknown) => {
  const apiError = toApiError(error);
  const code = (apiError.code ?? '').toUpperCase();

  if (code.includes('MOVIEDESK_BAD_QUERY') || code.includes('BAD_QUERY')) {
    return 'Configuração de consulta do Movidesk inválida. Revise os filtros e tente novamente.';
  }

  if (code.includes('MOVIEDESK_UNAVAILABLE') || code.includes('UNAVAILABLE')) {
    return 'Movidesk indisponível no momento. Aguarde alguns minutos e tente novamente.';
  }

  return apiError.message;
};

const invalidateNeedQueries = async (queryClient: ReturnType<typeof useQueryClient>, needId: number) => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: NEEDS_QUERY_KEYS.list }),
    queryClient.invalidateQueries({ queryKey: NEEDS_QUERY_KEYS.metricsSummary }),
    queryClient.invalidateQueries({ queryKey: NEEDS_QUERY_KEYS.history(needId) }),
  ]);
};

export const useNeedMutations = () => {
  const queryClient = useQueryClient();

  const triageMutation = useMutation({
    mutationFn: ({ needId, body }: { needId: number; body: NeedTriageRequest }) => triageNeed(needId, body),
    onSuccess: async (_, variables) => {
      await invalidateNeedQueries(queryClient, variables.needId);
      toast({ title: 'Necessidade triada com sucesso.' });
    },
    onError: showMutationError,
  });

  const startMutation = useMutation({
    mutationFn: ({ needId, body }: { needId: number; body: NeedStatusActionRequest }) => startNeed(needId, body),
    onSuccess: async (_, variables) => {
      await invalidateNeedQueries(queryClient, variables.needId);
      toast({ title: 'Necessidade iniciada com sucesso.' });
    },
    onError: showMutationError,
  });

  const blockMutation = useMutation({
    mutationFn: ({ needId, body }: { needId: number; body: NeedStatusActionRequest }) => blockNeed(needId, body),
    onSuccess: async (_, variables) => {
      await invalidateNeedQueries(queryClient, variables.needId);
      toast({ title: 'Necessidade bloqueada com sucesso.' });
    },
    onError: showMutationError,
  });

  const completeMutation = useMutation({
    mutationFn: ({ needId, body }: { needId: number; body: NeedStatusActionRequest }) => completeNeed(needId, body),
    onSuccess: async (_, variables) => {
      await invalidateNeedQueries(queryClient, variables.needId);
      toast({ title: 'Necessidade concluída com sucesso.' });
    },
    onError: showMutationError,
  });

  const cancelMutation = useMutation({
    mutationFn: ({ needId, body }: { needId: number; body: NeedStatusActionRequest }) => cancelNeed(needId, body),
    onSuccess: async (_, variables) => {
      await invalidateNeedQueries(queryClient, variables.needId);
      toast({ title: 'Necessidade cancelada com sucesso.' });
    },
    onError: showMutationError,
  });

  return {
    triageMutation,
    startMutation,
    blockMutation,
    completeMutation,
    cancelMutation,
  };
};

export const useRunSupportImportMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => runSupportImport(),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: NEEDS_QUERY_KEYS.list }),
        queryClient.invalidateQueries({ queryKey: NEEDS_QUERY_KEYS.metricsSummary }),
        queryClient.invalidateQueries({ queryKey: NEEDS_QUERY_KEYS.metricsByTeam }),
      ]);
      toast({
        title: 'Atualização concluída',
      });
    },
    onError: (error) => {
      const info = toApiErrorInfo(error, 'Falha ao atualizar dados do suporte.');
      const friendlyMessage = resolveSupportImportErrorMessage(error);
      toast({
        title: 'Falha ao atualizar dados do suporte',
        description: formatApiErrorInfo({ ...info, message: friendlyMessage }),
        variant: 'destructive',
      });
    },
  });
};
