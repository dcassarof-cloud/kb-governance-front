import { useMutation, useQuery } from '@tanstack/react-query';

import { cleanQueryParams } from '@/lib/clean-query-params';
import { governanceService, type IssuesFilter } from '@/services/governance.service';

export const useGovernanceIssues = (filters: IssuesFilter) => {
  const { signal: _signal, ...filtersWithoutSignal } = filters;
  const cleanedFilters = cleanQueryParams(filtersWithoutSignal);

  return useQuery({
    queryKey: ['governance-issues', JSON.stringify(cleanedFilters)],
    queryFn: ({ signal }) => governanceService.listIssues({ ...cleanedFilters, signal }),
    retry: false,
  });
};

export const useManualUpdatesReport = () =>
  useMutation({
    mutationKey: ['manualUpdatesReportCsv'],
    mutationFn: (params: { systemCode?: string; start?: string; end?: string }) =>
      governanceService.downloadManualUpdatesReport(params),
  });
