import { createElement, useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';

import { ResponsibleOption, governanceService } from '@/services/governance.service';
import { systemsService } from '@/services/systems.service';
import { authService, hasRole } from '@/services/auth.service';
import { governanceTexts } from '@/governanceTexts';
import { formatApiErrorInfo, toApiErrorInfo } from '@/lib/api-error-info';
import { cleanQueryParams } from '@/lib/clean-query-params';
import { toast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import type {
  GovernanceIssueDto,
  GovernanceOverviewSystemDto,
  IssueSeverity,
  IssueStatus,
  IssueType,
  KbSystem,
  PaginatedResponse,
} from '@/types';
import {
  GovernanceFilters,
  createInitialFilters,
  createInitialState,
  governanceReducer,
} from '@/features/governance/state/governanceReducer';
import { useGovernanceIssues, useManualUpdatesReport } from '@/features/governance/hooks/useGovernanceQueries';

const ISSUE_STATUS_FILTER_OPTIONS: IssueStatus[] = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'IGNORED'];
const ISSUE_SEVERITY_OPTIONS: IssueSeverity[] = ['INFO', 'WARN', 'ERROR'];
const ALLOWED_ISSUE_TYPES: IssueType[] = [
  'REVIEW_REQUIRED',
  'NOT_AI_READY',
  'DUPLICATE_CONTENT',
  'INCOMPLETE_CONTENT',
];

const isAllowedIssueType = (value: string | null | undefined): value is IssueType =>
  !!value && ALLOWED_ISSUE_TYPES.includes(value as IssueType);

const isAllowedIssueSeverity = (value: string | null | undefined): value is IssueSeverity =>
  !!value && ISSUE_SEVERITY_OPTIONS.includes(value as IssueSeverity);

export const ISSUE_STATUS_OPTIONS: IssueStatus[] = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'IGNORED'];
export const ISSUE_TYPE_LABELS: Record<IssueType, string> = governanceTexts.issueTypes;

const uniqueOptions = (values: Array<string | number | null | undefined>) =>
  Array.from(
    new Set(
      values
        .map((value) => {
          if (typeof value === 'string') {
            return value.trim();
          }
          if (typeof value === 'number') {
            return String(value);
          }
          return '';
        })
        .filter((value) => value.length > 0),
    ),
  );

const startOfToday = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

/**
 * Constrói query params da tela de governança.
 *
 * Fonte de verdade de filtros: URL.
 * Motivo: compartilhamento de contexto entre usuários, persistência em refresh e navegabilidade.
 */
function buildSearchParams(filters: GovernanceFilters, page: number): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.systemCode) params.set('systemCode', filters.systemCode);
  if (filters.status) params.set('status', filters.status);
  if (filters.type) params.set('type', filters.type);
  if (filters.severity) params.set('severity', filters.severity);
  if (filters.responsibleType) params.set('responsibleType', filters.responsibleType);
  if (filters.responsibleId) params.set('responsibleId', filters.responsibleId);
  if (filters.q) params.set('q', filters.q);
  if (filters.overdue) params.set('overdue', 'true');
  if (filters.unassigned) params.set('unassigned', 'true');
  if (page > 1) params.set('page', String(page));
  return params;
}

/**
 * Hook orquestrador da tela de Governança.
 *
 * Estados cobertos: loading/empty/error/sucesso para overview e lista de issues,
 * além de ações de atribuição, mudança de status e exportação.
 */
export function useGovernance() {
  const isManager = hasRole(['ADMIN', 'MANAGER']);
  const actorIdentifier = authService.getActorIdentifier() ?? '';
  const [searchParams, setSearchParams] = useSearchParams();
  const [state, dispatch] = useReducer(
    governanceReducer,
    createInitialFilters(isManager, actorIdentifier),
    createInitialState
  );
  const { filters, page, size, issuesData, overview, systems } = state;
  const queryClient = useQueryClient();
  const [debouncedFilters, setDebouncedFilters] = useState(filters);
  const [responsibleOptions, setResponsibleOptions] = useState<ResponsibleOption[]>([]);
  const [responsiblesWarning, setResponsiblesWarning] = useState<string | null>(null);
  const [responsiblesLoading, setResponsiblesLoading] = useState(false);
  const manualUpdatesReportMutation = useManualUpdatesReport();

  // Garante leitura inicial única da URL para evitar sobrescrever filtros ao montar a tela.
  const initialSyncDone = useRef(false);

  /**
   * Atualiza URL após interação do usuário (sem efeito colateral automático).
   * Isso evita loops entre estado local e `searchParams`.
   */
  const syncFiltersToUrl = useCallback(
    (nextFilters: GovernanceFilters, nextPage: number) => {
      setSearchParams(buildSearchParams(nextFilters, nextPage), { replace: true });
    },
    [setSearchParams],
  );

  const fetchOverview = async () => {
    dispatch({ type: 'SET_OVERVIEW_LOADING', payload: true });
    dispatch({ type: 'SET_OVERVIEW_ERROR', payload: null });
    try {
      const result = await governanceService.getOverview();
      dispatch({ type: 'SET_OVERVIEW', payload: result });
    } catch (err) {
      const info = toApiErrorInfo(err, governanceTexts.governance.summary.loadError);
      const message = formatApiErrorInfo(info);
      dispatch({ type: 'SET_OVERVIEW_ERROR', payload: message });
      toast({ title: governanceTexts.general.errorTitle, description: message, variant: 'destructive' });
    } finally {
      dispatch({ type: 'SET_OVERVIEW_LOADING', payload: false });
    }
  };

  const effectiveResponsibleId = isManager ? debouncedFilters.responsibleId : actorIdentifier;
  const issuesRequestKey = useMemo(
    () =>
      JSON.stringify(
        cleanQueryParams({
          page,
          size,
          systemCode: debouncedFilters.systemCode,
          status: debouncedFilters.status,
          type: isAllowedIssueType(debouncedFilters.type) ? debouncedFilters.type : undefined,
          severity: debouncedFilters.severity,
          responsibleType: debouncedFilters.responsibleType,
          responsibleId: effectiveResponsibleId,
          q: debouncedFilters.q,
          overdue: debouncedFilters.overdue,
          unassigned: debouncedFilters.unassigned,
          sort: 'createdAt,desc',
        })
      ),
    [debouncedFilters, effectiveResponsibleId, page, size],
  );
  const governanceIssuesQuery = useGovernanceIssues({
    page,
    size,
    systemCode: debouncedFilters.systemCode,
    status: debouncedFilters.status,
    type: isAllowedIssueType(debouncedFilters.type) ? debouncedFilters.type : undefined,
    severity: debouncedFilters.severity,
    responsibleType: debouncedFilters.responsibleType,
    responsibleId: effectiveResponsibleId,
    q: debouncedFilters.q,
    overdue: debouncedFilters.overdue,
    unassigned: debouncedFilters.unassigned,
    sort: 'createdAt,desc',
  });

  const fetchIssues = async () => {
    await governanceIssuesQuery.refetch();
  };


  const fetchResponsibleOptions = async (params?: { query?: string; responsibleType?: string }) => {
    setResponsiblesLoading(true);
    setResponsiblesWarning(null);
    try {
      const result = await governanceService.getResponsiblesOptions(params);
      const normalizedType = params?.responsibleType?.trim().toUpperCase();
      const normalizedQuery = params?.query?.trim().toLowerCase();
      const options = result.options.filter((option) => {
        const matchType =
          !normalizedType ||
          normalizedType.length === 0 ||
          !option.responsibleType ||
          option.responsibleType.toUpperCase() === normalizedType;
        const matchQuery =
          !normalizedQuery ||
          normalizedQuery.length === 0 ||
          option.label.toLowerCase().includes(normalizedQuery) ||
          option.value.toLowerCase().includes(normalizedQuery);
        return matchType && matchQuery;
      });
      setResponsibleOptions(options);
      setResponsiblesWarning(
        result.usedFallback
          ? 'Endpoint /users/responsibles indisponível. Usando fallback resumido de responsáveis.'
          : null,
      );
    } catch {
      setResponsibleOptions([]);
      setResponsiblesWarning('Falha ao carregar responsáveis.');
    } finally {
      setResponsiblesLoading(false);
    }
  };

  const fetchSystems = async () => {
    try {
      const result = await systemsService.getSystems();
      dispatch({ type: 'SET_SYSTEMS', payload: Array.isArray(result) ? (result as KbSystem[]) : [] });
    } catch {
      dispatch({ type: 'SET_SYSTEMS', payload: [] });
    }
  };

  const fetchSuggestedAssignee = async (query: string, responsibleType?: string) => {
    dispatch({ type: 'SET_SUGGESTED_LOADING', payload: true });
    dispatch({ type: 'SET_SUGGESTED_ERROR', payload: null });
    dispatch({ type: 'SET_SUGGESTED', payload: { assignee: null, alternatives: [] } });
    try {
      const result = await governanceService.getSuggestedAssignee(query, responsibleType ?? 'AGENT');
      dispatch({
        type: 'SET_SUGGESTED',
        payload: {
          assignee: result?.suggested ?? null,
          alternatives: result?.alternatives ?? [],
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : governanceTexts.governance.toasts.suggestionError;
      dispatch({ type: 'SET_SUGGESTED_ERROR', payload: message });
    } finally {
      dispatch({ type: 'SET_SUGGESTED_LOADING', payload: false });
    }
  };

  const updateIssueState = (issueId: string, updates: Partial<GovernanceIssueDto>) => {
    dispatch({
      type: 'SET_ISSUES_DATA',
      payload: (state.issuesData
        ? {
            ...state.issuesData,
            data: state.issuesData.data.map((issue) => (issue.id === issueId ? { ...issue, ...updates } : issue)),
          }
        : state.issuesData) as PaginatedResponse<GovernanceIssueDto> | null,
    });
  };

  const handleAssign = async (
    issue: GovernanceIssueDto,
    options: {
      dueDate?: string;
      createTicket?: boolean;
      responsibleType?: string;
      responsibleId?: string;
      responsibleName?: string;
    } = {}
  ) => {
    const previousResponsible = issue.responsible ?? null;
    updateIssueState(issue.id, { responsible: options.responsibleName ?? issue.responsible ?? null });
    dispatch({ type: 'SET_ACTION_LOADING', payload: { id: issue.id, action: 'assign' } });
    try {
      const updated = await governanceService.assignIssue(issue.id, options);
      updateIssueState(issue.id, {
        responsible: updated?.responsible ?? options.responsibleName ?? issue.responsible ?? null,
        responsibleId: updated?.responsibleId ?? options.responsibleId ?? issue.responsibleId,
        responsibleType: updated?.responsibleType ?? options.responsibleType ?? issue.responsibleType,
        responsibleName: updated?.responsibleName ?? options.responsibleName ?? issue.responsibleName,
      });
      const ticketUrl =
        (updated?.metadata?.ticketUrl as string | undefined) ??
        (updated?.metadata?.movideskTicketUrl as string | undefined) ??
        null;
      if (options.createTicket && updated?.metadata?.ticketNotCreated) {
        toast({ title: governanceTexts.general.attentionTitle, description: 'Atribuição salva, ticket não criado.' });
      } else if (ticketUrl) {
        toast({
          title: governanceTexts.general.update,
          description: governanceTexts.governance.assignDialog.success,
          action: createElement(ToastAction, { altText: 'Abrir ticket', onClick: () => window.open(ticketUrl, '_blank', 'noopener,noreferrer') }, 'Abrir ticket'),
        });
      } else {
        toast({ title: governanceTexts.general.update, description: governanceTexts.governance.assignDialog.success });
      }
      await Promise.all([fetchOverview(), fetchIssues()]);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['governance-issues'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-governance'] }),
        queryClient.invalidateQueries({ queryKey: ['governance-overview'] }),
        queryClient.invalidateQueries({ queryKey: ['responsibles-summary'] }),
      ]);
    } catch (err) {
      const info = toApiErrorInfo(err, governanceTexts.governance.toasts.assignError);
      const message = formatApiErrorInfo(info);
      updateIssueState(issue.id, { responsible: previousResponsible });
      toast({ title: governanceTexts.general.errorTitle, description: message, variant: 'destructive' });
    } finally {
      dispatch({ type: 'SET_ACTION_LOADING', payload: null });
    }
  };

  const handleStatusChange = async (issue: GovernanceIssueDto, status: IssueStatus, ignoredReason?: string) => {
    const previousStatus = issue.status;
    updateIssueState(issue.id, { status });
    dispatch({ type: 'SET_ACTION_LOADING', payload: { id: issue.id, action: 'status' } });
    try {
      const updated = await governanceService.changeStatus(issue.id, status, ignoredReason);
      const nextStatus = updated?.status ?? status;
      dispatch({
        type: 'SET_ISSUES_DATA',
        payload: state.issuesData
          ? {
              ...state.issuesData,
              data: state.issuesData.data
                .map((item) => (item.id === issue.id ? { ...item, status: nextStatus } : item))
                .filter((item) => !(filters.status && filters.status !== nextStatus && item.id === issue.id)),
              total: filters.status && filters.status !== nextStatus
                ? Math.max((state.issuesData.total ?? 0) - 1, 0)
                : state.issuesData.total,
            }
          : state.issuesData,
      });
      toast({ title: governanceTexts.general.update, description: governanceTexts.governance.statusDialog.success });
      await Promise.all([fetchOverview(), fetchIssues()]);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['governance-issues'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-governance'] }),
        queryClient.invalidateQueries({ queryKey: ['governance-overview'] }),
        queryClient.invalidateQueries({ queryKey: ['responsibles-summary'] }),
      ]);
    } catch (err) {
      const info = toApiErrorInfo(err, governanceTexts.governance.toasts.statusError);
      const message = formatApiErrorInfo(info);
      updateIssueState(issue.id, { status: previousStatus });
      toast({ title: governanceTexts.general.errorTitle, description: message, variant: 'destructive' });
    } finally {
      dispatch({ type: 'SET_ACTION_LOADING', payload: null });
    }
  };

  const handleFilterChange = (key: keyof GovernanceFilters, value: string) => {
    if (!isManager && (key === 'responsibleId' || key === 'responsibleType')) {
      return;
    }
    const nextFilters = { ...filters, [key]: value };
    dispatch({ type: 'SET_PAGE', payload: 1 });
    dispatch({ type: 'PATCH_FILTERS', payload: { [key]: value } });
    syncFiltersToUrl(nextFilters, 1);
  };

  const handleToggleChange = (key: 'overdue' | 'unassigned', value: boolean) => {
    const nextFilters = { ...filters, [key]: value };
    dispatch({ type: 'SET_PAGE', payload: 1 });
    dispatch({ type: 'PATCH_FILTERS', payload: { [key]: value } });
    syncFiltersToUrl(nextFilters, 1);
  };

  const handleCriticalToggle = (value: boolean) => {
    const nextFilters = { ...filters, severity: value ? 'ERROR' : undefined };
    dispatch({ type: 'SET_PAGE', payload: 1 });
    dispatch({ type: 'PATCH_FILTERS', payload: { severity: value ? 'ERROR' : undefined } });
    syncFiltersToUrl(nextFilters, 1);
  };

  const clearFilters = () => {
    const nextFilters = createInitialFilters(isManager, actorIdentifier);
    dispatch({ type: 'SET_PAGE', payload: 1 });
    dispatch({ type: 'SET_FILTERS', payload: nextFilters });
    syncFiltersToUrl(nextFilters, 1);
  };


  const searchResponsibles = (query: string, responsibleType?: string) => {
    const trimmed = query.trim();
    if (!state.assign.target) {
      dispatch({ type: 'SET_SUGGESTED', payload: { assignee: null, alternatives: [] } });
      return;
    }
    const resolvedType = responsibleType ?? 'AGENT';
    fetchSuggestedAssignee(trimmed, resolvedType);
    fetchResponsibleOptions({ query: trimmed, responsibleType: resolvedType });
  };

  const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return governanceTexts.general.notAvailable;
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR');
    } catch {
      return governanceTexts.general.notAvailable;
    }
  };

  const formatInputDate = (date: Date) => {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getDueDateValue = (issue: GovernanceIssueDto) => issue.slaDueAt ?? issue.dueDate ?? null;

  const getSlaStatus = (issue: GovernanceIssueDto) => {
    if (issue.status === 'RESOLVED' || issue.status === 'IGNORED') {
      return {
        label: governanceTexts.status.labels[issue.status],
        variant: 'secondary' as const,
        className: 'bg-muted text-muted-foreground',
        priority: 4,
        icon: 'check' as const,
      };
    }

    const dueDateValue = getDueDateValue(issue);
    if (!dueDateValue) {
      return {
        label: governanceTexts.governance.statusLabels.noDueDate,
        variant: 'secondary' as const,
        className: 'bg-muted text-muted-foreground',
        priority: 3,
        icon: 'none' as const,
      };
    }

    const dueDate = new Date(dueDateValue);
    if (Number.isNaN(dueDate.getTime())) {
      return {
        label: governanceTexts.governance.statusLabels.noDueDate,
        variant: 'secondary' as const,
        className: 'bg-muted text-muted-foreground',
        priority: 3,
        icon: 'none' as const,
      };
    }

    const today = startOfToday();
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);

    if (due < today) {
      return {
        label: governanceTexts.governance.statusLabels.overdue,
        variant: 'destructive' as const,
        className: '',
        priority: 0,
        icon: 'alert' as const,
      };
    }
    if (due.getTime() === today.getTime()) {
      return {
        label: governanceTexts.governance.statusLabels.dueToday,
        variant: 'secondary' as const,
        className: 'bg-warning text-warning-foreground',
        priority: 1,
        icon: 'warning' as const,
      };
    }
    return {
      label: governanceTexts.governance.statusLabels.onTrack,
      variant: 'secondary' as const,
      className: 'bg-success text-success-foreground',
      priority: 2,
      icon: 'check' as const,
    };
  };

  const getOverdueDays = (issue: GovernanceIssueDto) => {
    const dueDateValue = getDueDateValue(issue);
    if (!dueDateValue) return null;
    const dueDate = new Date(dueDateValue);
    if (Number.isNaN(dueDate.getTime())) return null;
    const today = startOfToday();
    dueDate.setHours(0, 0, 0, 0);
    if (dueDate >= today) return null;
    const diffMs = today.getTime() - dueDate.getTime();
    return Math.max(Math.floor(diffMs / (1000 * 60 * 60 * 24)), 0);
  };

  const getShortSeverityLabel = (severity?: IssueSeverity | null) => {
    if (!severity) return governanceTexts.general.notAvailable;
    return governanceTexts.severity.shortLabels[severity];
  };

  const getStatusLabel = (status?: IssueStatus | null) => {
    if (!status) return governanceTexts.general.notAvailable;
    return governanceTexts.status.labels[status];
  };

  const getPriorityLevel = (issue: GovernanceIssueDto) => issue.priorityLevel ?? issue.severity ?? 'INFO';

  const generateSystemsReport = async () => {
    try {
      const now = new Date();
      const end = now.toISOString();
      const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const blob = await manualUpdatesReportMutation.mutateAsync({
        systemCode: filters.systemCode,
        start,
        end,
      });

      const fileUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const startLabel = start.slice(0, 10);
      const endLabel = end.slice(0, 10);

      link.href = fileUrl;
      link.download = `manual-updates-${startLabel}_${endLabel}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(fileUrl);

      toast({ title: 'Relatório gerado', description: 'Download CSV iniciado.' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Não foi possível gerar o relatório CSV.';
      toast({
        title: governanceTexts.general.errorTitle,
        description: message,
        variant: 'destructive',
        action: createElement(ToastAction, { altText: governanceTexts.general.retry, onClick: generateSystemsReport }, 'Recarregar'),
      });
    }
  };

  const getPriorityClasses = (priority: IssueSeverity) => {
    if (priority === 'ERROR') {
      return 'bg-destructive/15 text-destructive border-destructive/40';
    }
    if (priority === 'WARN') {
      return 'bg-warning/20 text-warning border-warning/40';
    }
    return 'bg-muted text-muted-foreground border-border';
  };

  useEffect(() => {
    fetchOverview();
    fetchSystems();
    fetchResponsibleOptions({ responsibleType: 'AGENT' });
  }, []);

  // Read URL → state: runs on mount and when URL changes externally (e.g. Dashboard navigate).
  // We serialize searchParams to a string so internal setSearchParams calls with the same
  // effective params don't re-trigger this effect unnecessarily.
  const searchParamsString = searchParams.toString();
  useEffect(() => {
    const sp = new URLSearchParams(searchParamsString);
    const responsibleId = sp.get('responsibleId') ?? sp.get('responsible') ?? '';
    const responsibleType = sp.get('responsibleType') ?? '';
    const assignTo = sp.get('assignTo') ?? '';
    const assignIssueId = sp.get('assignIssueId') ?? '';
    const systemCode = sp.get('systemCode') ?? sp.get('system') ?? '';
    const status = sp.get('status') ?? '';
    const type = sp.get('type') ?? '';
    const severity = sp.get('severity') ?? '';
    const q = sp.get('q') ?? '';
    const overdue = sp.get('overdue') === 'true';
    const unassigned = sp.get('unassigned') === 'true';
    const pageParam = Number(sp.get('page') ?? '1');

    const safeType = isAllowedIssueType(type) ? type : undefined;
    const safeSeverity = isAllowedIssueSeverity(severity) ? severity : undefined;

    dispatch({
      type: 'PATCH_FILTERS',
      payload: {
        responsibleId: isManager ? responsibleId : actorIdentifier,
        responsibleType: isManager ? responsibleType : undefined,
        systemCode,
        status: status ? (status as IssueStatus) : undefined,
        type: safeType,
        severity: safeSeverity,
        q,
        overdue,
        unassigned,
      },
    });
    dispatch({ type: 'SET_PAGE', payload: Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1 });

    if (assignTo && isManager) {
      dispatch({ type: 'SET_ASSIGN_FIELD', payload: { responsibleId: assignTo } });
    }

    if (assignIssueId && isManager) {
      governanceService
        .getIssueById(assignIssueId)
        .then((issue) => dispatch({ type: 'OPEN_ASSIGN', payload: issue }))
        .catch((err) => {
          const message =
            err instanceof Error ? err.message : governanceTexts.governance.toasts.loadError;
          toast({ title: governanceTexts.general.errorTitle, description: message, variant: 'destructive' });
        });
    } else if (!isManager) {
      dispatch({ type: 'CLOSE_ASSIGN' });
    }

    initialSyncDone.current = true;
  }, [searchParamsString, isManager, actorIdentifier]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedFilters(filters);
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [filters]);

  useEffect(() => {
    dispatch({ type: 'SET_ISSUES_ERROR', payload: null });
    dispatch({ type: 'SET_ISSUES_DATA', payload: null });
  }, [issuesRequestKey]);

  useEffect(() => {
    dispatch({ type: 'SET_ISSUES_LOADING', payload: governanceIssuesQuery.isLoading || governanceIssuesQuery.isFetching });
  }, [governanceIssuesQuery.isFetching, governanceIssuesQuery.isLoading]);

  useEffect(() => {
    if (!governanceIssuesQuery.error) {
      dispatch({ type: 'SET_ISSUES_ERROR', payload: null });
      return;
    }

    const info = toApiErrorInfo(governanceIssuesQuery.error, governanceTexts.governance.toasts.loadError);
    const correlationRef = info.correlationId ?? 'N/A';
    const message = formatApiErrorInfo(info);
    const messageWithRef = info.correlationId ? `${message} • Ref: ${info.correlationId}` : message;

    dispatch({ type: 'SET_ISSUES_ERROR', payload: messageWithRef });
    toast({
      title: 'Falha ao carregar governança',
      description: `Falha ao carregar dados. Ref: ${correlationRef}`,
      variant: 'destructive',
    });
  }, [governanceIssuesQuery.error]);

  useEffect(() => {
    if (!governanceIssuesQuery.data) return;

    const normalized: PaginatedResponse<GovernanceIssueDto> = {
      data: Array.isArray(governanceIssuesQuery.data?.data) ? governanceIssuesQuery.data.data : [],
      total: governanceIssuesQuery.data?.total ?? 0,
      page: governanceIssuesQuery.data?.page ?? page,
      size: governanceIssuesQuery.data?.size ?? size,
      totalPages: governanceIssuesQuery.data?.totalPages ?? 0,
    };

    dispatch({ type: 'SET_ISSUES_DATA', payload: normalized });
  }, [governanceIssuesQuery.data, page, size]);

  // REMOVED: automatic state→URL sync effect that caused the filter flicker loop.
  // URL is now updated ONLY from event handlers (handleFilterChange, handleToggleChange, etc.).

  useEffect(() => {
    if (!state.assign.target) {
      dispatch({
        type: 'SET_ASSIGN_FIELD',
        payload: { responsibleId: '', responsibleName: '', responsibleType: 'AGENT', dueDate: '' },
      });
      dispatch({ type: 'SET_SUGGESTED', payload: { assignee: null, alternatives: [] } });
      dispatch({ type: 'SET_SUGGESTED_ERROR', payload: null });
      dispatch({ type: 'SET_SUGGESTED_LOADING', payload: false });
      return;
    }
    const assignTo = searchParams.get('assignTo');
    const fallbackResponsible = state.assign.target.responsibleName ?? state.assign.target.responsible ?? '';
    dispatch({
      type: 'SET_ASSIGN_FIELD',
      payload: {
        responsibleId: assignTo ?? state.assign.target.responsibleId ?? '',
        responsibleName: fallbackResponsible,
      },
    });
    const baseQuery = (assignTo ?? fallbackResponsible ?? '').trim();
    const resolvedType = state.assign.responsibleType || 'AGENT';
    fetchSuggestedAssignee(baseQuery, resolvedType);
    fetchResponsibleOptions({ query: baseQuery, responsibleType: resolvedType });
  }, [state.assign.target, searchParams, state.assign.responsibleType]);

  const issues = useMemo(() => issuesData?.data ?? [], [issuesData]);

  useEffect(() => {
    const rows = buildSystemRows(overview?.systems ?? null, issues, systems);
    dispatch({ type: 'SET_SYSTEM_ROWS', payload: rows });
  }, [overview?.systems, issues, systems]);

  const systemOptions = useMemo(() => {
    if (systems.length > 0) {
      return systems.map((system) => system?.code).filter(Boolean) as string[];
    }
    return uniqueOptions(issues.map((issue) => issue?.systemCode));
  }, [issues, systems]);

  const statusOptions = useMemo(() => uniqueOptions(issues.map((issue) => issue?.status)), [issues]);
  const typeOptions = useMemo(() => uniqueOptions(issues.map((issue) => issue?.type)), [issues]);

  const resolvedStatusOptions = statusOptions.length > 0 ? statusOptions : ISSUE_STATUS_FILTER_OPTIONS;
  const resolvedTypeOptions = typeOptions.length > 0 ? typeOptions : ALLOWED_ISSUE_TYPES;
  const resolvedSeverityOptions = ISSUE_SEVERITY_OPTIONS;

  const summaryMetrics = useMemo(() => {
    const metrics = [
      {
        key: 'openTotal',
        title: governanceTexts.governance.summary.openTotal,
        value: overview?.openTotal,
        icon: 'alert',
        variant: 'warning' as const,
      },
      {
        key: 'errorOpen',
        title: governanceTexts.governance.summary.errorOpen,
        value: overview?.errorOpen ?? overview?.criticalOpen,
        icon: 'triangle',
        variant: 'error' as const,
      },
      {
        key: 'unassignedOpen',
        title: governanceTexts.governance.summary.unassignedOpen,
        value: overview?.unassignedOpen,
        icon: 'user',
        variant: 'warning' as const,
      },
      {
        key: 'overdueOpen',
        title: governanceTexts.governance.summary.overdueOpen,
        value: overview?.overdueOpen,
        icon: 'calendar',
        variant: 'error' as const,
      },
    ];

    return metrics.filter((metric) => typeof metric.value === 'number' && Number.isFinite(metric.value));
  }, [overview]);

  const totalPages = issuesData?.totalPages ?? 0;

  return {
    state,
    isManager,
    actorIdentifier,
    issues,
    totalPages,
    resolvedStatusOptions,
    resolvedTypeOptions,
    resolvedSeverityOptions,
    systemOptions,
    summaryMetrics,
    formatDate,
    formatInputDate,
    getDueDateValue,
    getSlaStatus,
    getOverdueDays,
    getShortSeverityLabel,
    getStatusLabel,
    getPriorityLevel,
    getPriorityClasses,
    generatingReport: manualUpdatesReportMutation.isPending,
    generateSystemsReport,
    responsibleOptions,
    responsiblesWarning,
    responsiblesLoading,
    fetchResponsibleOptions,
    fetchIssues,
    fetchOverview,
    handleAssign,
    handleStatusChange,
    fetchSuggestedAssignee,
    searchResponsibles,
    handleFilterChange,
    handleToggleChange,
    handleCriticalToggle,
    clearFilters,
    setPage: (value: number) => {
      dispatch({ type: 'SET_PAGE', payload: value });
      syncFiltersToUrl(filters, value);
    },
    openAssign: (issue: GovernanceIssueDto) => dispatch({ type: 'OPEN_ASSIGN', payload: issue }),
    closeAssign: () => dispatch({ type: 'CLOSE_ASSIGN' }),
    setAssignField: (payload: Partial<typeof state.assign>) =>
      dispatch({ type: 'SET_ASSIGN_FIELD', payload }),
    openStatus: (issue: GovernanceIssueDto) => dispatch({ type: 'OPEN_STATUS', payload: issue }),
    closeStatus: () => dispatch({ type: 'CLOSE_STATUS' }),
    setStatusField: (payload: Partial<typeof state.status>) =>
      dispatch({ type: 'SET_STATUS_FIELD', payload }),
  };
}

function buildSystemRows(
  overviewSystems: GovernanceOverviewSystemDto[] | null,
  issues: GovernanceIssueDto[],
  systems: KbSystem[]
): GovernanceOverviewSystemDto[] {
  if (overviewSystems && overviewSystems.length > 0) {
    return overviewSystems;
  }

  const issueMap = new Map<string, GovernanceOverviewSystemDto>();
  issues.forEach((issue) => {
    const systemCode = issue.systemCode || governanceTexts.general.notAvailable;
    const existing = issueMap.get(systemCode) ?? {
      systemCode,
      systemName: issue.systemName ?? null,
      openIssues: 0,
      errorOpen: 0,
      overdueOpen: 0,
      unassignedOpen: 0,
    };

    existing.openIssues = (existing.openIssues ?? 0) + 1;
    if (issue.severity === 'ERROR') {
      existing.errorOpen = (existing.errorOpen ?? 0) + 1;
    }
    if (!issue.responsible) {
      existing.unassignedOpen = (existing.unassignedOpen ?? 0) + 1;
    }
    const dueDateValue = issue.slaDueAt ?? issue.dueDate ?? null;
    if (dueDateValue) {
      const dueDate = new Date(dueDateValue);
      if (!Number.isNaN(dueDate.getTime())) {
        const today = startOfToday();
        dueDate.setHours(0, 0, 0, 0);
        if (dueDate < today) {
          existing.overdueOpen = (existing.overdueOpen ?? 0) + 1;
        }
      }
    }
    issueMap.set(systemCode, existing);
  });

  const rows = Array.from(issueMap.values());
  if (systems.length === 0) return rows;

  return systems.map((system) => {
    const mapped = issueMap.get(system.code) ?? { systemCode: system.code };
    return {
      ...mapped,
      systemName: mapped.systemName ?? system.name,
      healthScore: system.qualityScore ?? null,
    };
  });
}
