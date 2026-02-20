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

export const useNeedsList = (filters: NeedsListFilters) =>
  useQuery({
    queryKey: ['needs', { teamId: filters.teamId ?? null, systemCode: filters.systemCode ?? null, q: filters.q ?? null }],
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
    queryKey: ['needsMetricsSummary'],
    queryFn: getNeedMetricsSummary,
    retry: false,
  });

export const useNeedsMetricsByTeamQuery = () =>
  useQuery({
    queryKey: ['needsMetricsByTeam'],
    queryFn: getNeedsMetricsByTeam,
    retry: false,
  });

export const useNeedHistory = (needId?: number | null, enabled = true) =>
  useQuery({
    queryKey: ['needHistory', needId],
    queryFn: () => needsService.getNeedHistory(needId as number),
    enabled: enabled && !!needId,
    retry: false,
  });

export const useNeedDetail = (needId?: number | null, enabled = true) =>
  useQuery({
    queryKey: ['needDetail', needId],
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
    queryClient.invalidateQueries({ queryKey: ['needs'] }),
    queryClient.invalidateQueries({ queryKey: ['needsMetricsSummary'] }),
    queryClient.invalidateQueries({ queryKey: ['needHistory', needId] }),
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
        queryClient.invalidateQueries({ queryKey: ['needs'] }),
        queryClient.invalidateQueries({ queryKey: ['needsMetricsSummary'] }),
        queryClient.invalidateQueries({ queryKey: ['needsMetricsByTeam'] }),
      ]);
      toast({
        title: 'Importação do suporte iniciada.',
        description: 'Os dados serão atualizados conforme o processamento do backend.',
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
