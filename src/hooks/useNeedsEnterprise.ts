import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { toast } from '@/hooks/use-toast';
import { formatApiErrorInfo, toApiErrorInfo } from '@/lib/api-error-info';
import { toApiError } from '@/lib/handle-api-error';
import {
  blockNeed,
  cancelNeed,
  completeNeed,
  generateNeedsDemo,
  getNeedHistory,
  getNeedMetricsSummary,
  getNeedsDebugCounts,
  getNeedsMetricsByTeam,
  needsService,
  runSupportImport,
  startNeed,
  triageNeed,
} from '@/services/needs.service';
import { NeedStatusActionRequest, NeedTriageRequest } from '@/types/needs-enterprise';

export const useNeedsList = (teamId?: number | string | null) =>
  useQuery({
    queryKey: ['needs', { teamId: teamId ?? null }],
    queryFn: () => needsService.listNeeds({ page: 1, size: 100, teamId: teamId ?? undefined }),
    retry: false,
  });

export const useNeedMetricsSummary = () =>
  useQuery({
    queryKey: ['needsMetricsSummary'],
    queryFn: getNeedMetricsSummary,
    retry: false,
  });


export const useNeedsDebugCountsQuery = (enabled: boolean) =>
  useQuery({
    queryKey: ['needsDebugCounts'],
    queryFn: getNeedsDebugCounts,
    enabled,
    retry: false,
  });

export const useNeedsMetricsByTeamQuery = (enabled: boolean) =>
  useQuery({
    queryKey: ['needsMetricsByTeam'],
    queryFn: getNeedsMetricsByTeam,
    enabled,
    retry: false,
  });

export const useNeedHistory = (needId?: number | null, enabled = true) =>
  useQuery({
    queryKey: ['needHistory', needId],
    queryFn: () => getNeedHistory(needId as number),
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
        queryClient.invalidateQueries({ queryKey: ['needsDebugCounts'] }),
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

export const useNeedLegacyActions = () => {
  const queryClient = useQueryClient();

  const createTaskMutation = useMutation({
    mutationFn: (needId: number) => needsService.createInternalTask(String(needId)),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['needs'] }),
        queryClient.invalidateQueries({ queryKey: ['needsMetricsSummary'] }),
      ]);
      toast({ title: 'Task criada com sucesso.' });
    },
    onError: showMutationError,
  });

  const createTicketMutation = useMutation({
    mutationFn: (needId: number) => needsService.createMasterTicket(String(needId)),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['needs'] }),
        queryClient.invalidateQueries({ queryKey: ['needsMetricsSummary'] }),
      ]);
      toast({ title: 'Master ticket criado com sucesso.' });
    },
    onError: showMutationError,
  });

  return {
    createTaskMutation,
    createTicketMutation,
  };
};


export const useGenerateNeedsDemoMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (count: number) => generateNeedsDemo(count),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['needs'] }),
        queryClient.invalidateQueries({ queryKey: ['needsMetricsSummary'] }),
        queryClient.invalidateQueries({ queryKey: ['needsMetricsByTeam'] }),
        queryClient.invalidateQueries({ queryKey: ['needsDebugCounts'] }),
      ]);
      toast({ title: 'Dados de demo gerados com sucesso.' });
    },
    onError: (error) => {
      const info = toApiErrorInfo(error, 'Falha ao gerar dados de demo.');
      toast({
        title: info.status === 403 ? 'Demo desabilitado' : 'Falha ao gerar dados de demo',
        description: info.status === 403 ? 'O endpoint de demo está desabilitado no backend.' : info.message,
        variant: 'destructive',
      });
    },
  });
};
