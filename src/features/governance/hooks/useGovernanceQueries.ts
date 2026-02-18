import { useMutation, useQuery } from '@tanstack/react-query';

import { cleanQueryParams } from '@/lib/clean-query-params';
import { governanceService, type IssuesFilter } from '@/services/governance.service';

/**
 * Hook React Query para listagem de issues de governança.
 *
 * Contrato:
 * - input: filtros compatíveis com endpoint `/governance/issues`;
 * - output: query com loading/error/data/refetch;
 * - cache key: filtros serializados após limpeza (evita chave com ruído);
 * - refetch: manual via `refetch` ou invalidation por query key.
 */
export const useGovernanceIssues = (filters: IssuesFilter) => {
  const { signal: _signal, ...filtersWithoutSignal } = filters;
  const cleanedFilters = cleanQueryParams(filtersWithoutSignal);

  return useQuery({
    queryKey: ['governance-issues', JSON.stringify(cleanedFilters)],
    queryFn: ({ signal }) => governanceService.listIssues({ ...cleanedFilters, signal }),
    retry: false,
  });
};

/**
 * Mutation para download do relatório CSV de atualizações manuais.
 *
 * Não usa cache persistente por ser operação de exportação sob demanda.
 */
export const useManualUpdatesReport = () =>
  useMutation({
    mutationKey: ['manualUpdatesReportCsv'],
    mutationFn: (params: { systemCode?: string; start?: string; end?: string }) =>
      governanceService.downloadManualUpdatesReport(params),
  });


/**
 * Hook para resumo de responsáveis.
 * Não força fallback de endpoint: quem consome decide a UX quando endpoint estiver ausente.
 */
export const useResponsiblesSummary = (enabled = true) =>
  useQuery({
    queryKey: ['responsibles-summary'],
    queryFn: () => governanceService.getResponsiblesSummary(),
    enabled,
    retry: false,
  });
