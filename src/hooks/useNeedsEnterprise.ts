import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { toast } from '@/hooks/use-toast';
import { toApiErrorInfo } from '@/lib/api-error-info';
import {
  blockNeed,
  cancelNeed,
  completeNeed,
  getNeedHistory,
  getNeedMetricsSummary,
  needsService,
  startNeed,
  triageNeed,
} from '@/services/needs.service';
import { NeedStatusActionRequest, NeedTriageRequest } from '@/types/needs-enterprise';

export const useNeedsList = () =>
  useQuery({
    queryKey: ['needs'],
    queryFn: () => needsService.listNeeds({ page: 1, size: 100 }),
    retry: false,
  });

export const useNeedMetricsSummary = () =>
  useQuery({
    queryKey: ['needsMetricsSummary'],
    queryFn: getNeedMetricsSummary,
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
