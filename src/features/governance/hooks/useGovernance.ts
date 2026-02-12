import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';

import { ResponsibleOption, governanceService } from '@/services/governance.service';
import { systemsService } from '@/services/systems.service';
import { authService, hasRole } from '@/services/auth.service';
import { governanceTexts } from '@/governanceTexts';
import { formatApiErrorInfo, toApiErrorInfo } from '@/lib/api-error-info';
import { toast } from '@/hooks/use-toast';
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

const ISSUE_STATUS_FILTER_OPTIONS: IssueStatus[] = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'IGNORED'];
const ISSUE_SEVERITY_OPTIONS: IssueSeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const ALLOWED_ISSUE_TYPES: IssueType[] = [
  'REVIEW_REQUIRED',
  'NOT_AI_READY',
  'DUPLICATE_CONTENT',
  'INCOMPLETE_CONTENT',
];

const isAllowedIssueType = (value: string | null | undefined): value is IssueType =>
  !!value && ALLOWED_ISSUE_TYPES.includes(value as IssueType);

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

export function useGovernance() {
  const isManager = hasRole(['ADMIN', 'MANAGER']);
  const actorIdentifier = authService.getActorIdentifier() ?? '';
  const [searchParams, setSearchParams] = useSearchParams();
  const [state, dispatch] = useReducer(
    governanceReducer,
    createInitialFilters(isManager, actorIdentifier),
    createInitialState
  );
  const debounceRef = useRef<number>();
  const abortRef = useRef<AbortController | null>(null);
  const queryClient = useQueryClient();
  const [generatingReport, setGeneratingReport] = useState(false);
  const [responsibleOptions, setResponsibleOptions] = useState<ResponsibleOption[]>([]);
  const [responsiblesWarning, setResponsiblesWarning] = useState<string | null>(null);

  const { filters, page, size, issuesData, overview, systems } = state;

  const clearAbort = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  };

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

  const fetchIssues = async (currentFilters = filters, currentPage = page) => {
    dispatch({ type: 'SET_ISSUES_LOADING', payload: true });
    dispatch({ type: 'SET_ISSUES_ERROR', payload: null });
    clearAbort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const effectiveResponsibleId = isManager ? currentFilters.responsibleId : actorIdentifier;
      const result = await governanceService.listIssues({
        page: currentPage,
        size,
        systemCode: currentFilters.systemCode || undefined,
        status: currentFilters.status || undefined,
        type: isAllowedIssueType(currentFilters.type) ? currentFilters.type : undefined,
        severity: currentFilters.severity || undefined,
        responsibleType: currentFilters.responsibleType?.trim() || undefined,
        responsibleId: effectiveResponsibleId?.trim() || undefined,
        q: currentFilters.q?.trim() || undefined,
        overdue: currentFilters.overdue || undefined,
        unassigned: currentFilters.unassigned || undefined,
        sort: 'createdAt,desc',
        signal: controller.signal,
      });

      const normalized: PaginatedResponse<GovernanceIssueDto> = {
        data: Array.isArray(result?.data) ? result.data : [],
        total: result?.total ?? 0,
        page: result?.page ?? currentPage,
        size: result?.size ?? size,
        totalPages: result?.totalPages ?? 0,
      };

      dispatch({ type: 'SET_ISSUES_DATA', payload: normalized });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      const info = toApiErrorInfo(err, governanceTexts.governance.toasts.loadError);
      const message = formatApiErrorInfo(info);
      dispatch({ type: 'SET_ISSUES_ERROR', payload: message });
      toast({
        title: 'Falha ao carregar governança',
        description: message,
        variant: 'destructive',
      });
    } finally {
      dispatch({ type: 'SET_ISSUES_LOADING', payload: false });
    }
  };


  const fetchResponsibleOptions = async () => {
    try {
      const result = await governanceService.getResponsiblesOptions();
      setResponsibleOptions(result.options);
      setResponsiblesWarning(
        result.usedFallback
          ? 'Endpoint /users/responsibles indisponível. Usando fallback resumido de responsáveis.'
          : null,
      );
    } catch {
      setResponsibleOptions([]);
      setResponsiblesWarning('Não foi possível carregar a lista de responsáveis.');
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

  const fetchSuggestedAssignee = async (query: string) => {
    dispatch({ type: 'SET_SUGGESTED_LOADING', payload: true });
    dispatch({ type: 'SET_SUGGESTED_ERROR', payload: null });
    dispatch({ type: 'SET_SUGGESTED', payload: { assignee: null, alternatives: [] } });
    try {
      const result = await governanceService.getSuggestedAssignee(query);
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
      toast({ title: governanceTexts.general.update, description: governanceTexts.governance.assignDialog.success });
      await Promise.all([fetchOverview(), fetchIssues(filters, page)]);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['governanceIssues'] }),
        queryClient.invalidateQueries({ queryKey: ['responsiblesSummary'] }),
        queryClient.invalidateQueries({ queryKey: ['responsiblesWorkload'] }),
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
      await Promise.all([fetchOverview(), fetchIssues(filters, page)]);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['governanceIssues'] }),
        queryClient.invalidateQueries({ queryKey: ['responsiblesSummary'] }),
        queryClient.invalidateQueries({ queryKey: ['responsiblesWorkload'] }),
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
    dispatch({ type: 'SET_PAGE', payload: 1 });
    dispatch({ type: 'PATCH_FILTERS', payload: { [key]: value } });
  };

  const handleToggleChange = (key: 'overdue' | 'unassigned', value: boolean) => {
    dispatch({ type: 'SET_PAGE', payload: 1 });
    dispatch({ type: 'PATCH_FILTERS', payload: { [key]: value } });
  };

  const handleCriticalToggle = (value: boolean) => {
    dispatch({ type: 'SET_PAGE', payload: 1 });
    dispatch({ type: 'PATCH_FILTERS', payload: { severity: value ? 'CRITICAL' : undefined } });
  };

  const clearFilters = () => {
    dispatch({ type: 'SET_PAGE', payload: 1 });
    dispatch({ type: 'SET_FILTERS', payload: createInitialFilters(isManager, actorIdentifier) });
  };


  const searchResponsibles = (query: string) => {
    const trimmed = query.trim();
    if (!state.assign.target || trimmed.length < 2) {
      dispatch({ type: 'SET_SUGGESTED', payload: { assignee: null, alternatives: [] } });
      return;
    }
    fetchSuggestedAssignee(trimmed);
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

  const getPriorityLevel = (issue: GovernanceIssueDto) => issue.priorityLevel ?? issue.severity ?? 'LOW';

  const generateSystemsReport = async () => {
    setGeneratingReport(true);
    try {
      const now = new Date();
      const end = now.toISOString().slice(0, 10);
      const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

      const blob = await governanceService.downloadManualUpdatesReport({
        systemCode: filters.systemCode || undefined,
        start,
        end,
      });

      const fileUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = `manual-updates-${filters.systemCode || 'all'}-${start}-${end}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(fileUrl);
      toast({ title: 'Relatório gerado', description: 'Download CSV iniciado.' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Não foi possível gerar o relatório CSV.';
      toast({ title: governanceTexts.general.errorTitle, description: message, variant: 'destructive' });
    } finally {
      setGeneratingReport(false);
    }
  };

  const getPriorityClasses = (priority: IssueSeverity) => {
    if (priority === 'CRITICAL') {
      return 'bg-destructive/15 text-destructive border-destructive/40';
    }
    if (priority === 'HIGH') {
      return 'bg-warning/20 text-warning border-warning/40';
    }
    return 'bg-muted text-muted-foreground border-border';
  };

  useEffect(() => {
    fetchOverview();
    fetchSystems();
    fetchResponsibleOptions();
    fetchIssues(filters, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => clearAbort(), []);

  useEffect(() => {
    const responsibleId = searchParams.get('responsibleId') ?? searchParams.get('responsible') ?? '';
    const responsibleType = searchParams.get('responsibleType') ?? '';
    const assignTo = searchParams.get('assignTo') ?? '';
    const assignIssueId = searchParams.get('assignIssueId') ?? '';
    const systemCode = searchParams.get('systemCode') ?? searchParams.get('system') ?? '';
    const status = searchParams.get('status') ?? '';
    const type = searchParams.get('type') ?? '';
    const severity = searchParams.get('severity') ?? '';
    const q = searchParams.get('q') ?? '';
    const overdue = searchParams.get('overdue') === 'true';
    const unassigned = searchParams.get('unassigned') === 'true';
    const pageParam = Number(searchParams.get('page') ?? '1');

    const safeType = isAllowedIssueType(type) ? type : undefined;

    dispatch({
      type: 'PATCH_FILTERS',
      payload: {
        responsibleId: isManager ? responsibleId : actorIdentifier,
        responsibleType: isManager ? responsibleType : filters.responsibleType,
        systemCode,
        status: status ? (status as IssueStatus) : undefined,
        type: safeType,
        severity: severity ? (severity as IssueSeverity) : undefined,
        q,
        overdue,
        unassigned,
      },
    });
    dispatch({ type: 'SET_PAGE', payload: Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1 });

    if (assignTo && isManager) {
      dispatch({ type: 'SET_ASSIGN_FIELD', payload: { value: assignTo, responsibleId: assignTo } });
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
  }, [searchParams, isManager, actorIdentifier]);

  useEffect(() => {
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }
    debounceRef.current = window.setTimeout(() => {
      fetchIssues(filters, page);
    }, 300);

    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
    };
  }, [filters, page]);

  useEffect(() => {
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

    if (params.toString() !== searchParams.toString()) {
      setSearchParams(params, { replace: true });
    }
  }, [filters, page, searchParams, setSearchParams]);

  useEffect(() => {
    if (!state.assign.target) {
      dispatch({
        type: 'SET_ASSIGN_FIELD',
        payload: { value: '', responsibleId: '', responsibleType: 'USER', dueDate: '' },
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
        value: assignTo ?? fallbackResponsible,
        responsibleId: assignTo ?? state.assign.target.responsibleId ?? fallbackResponsible,
      },
    });
    const baseQuery = (assignTo ?? fallbackResponsible ?? '').trim();
    fetchSuggestedAssignee(baseQuery);
  }, [state.assign.target, searchParams]);

  useEffect(() => {
    const issues = issuesData?.data ?? [];
    const rows = buildSystemRows(overview?.systems ?? null, issues, systems);
    dispatch({ type: 'SET_SYSTEM_ROWS', payload: rows });
  }, [overview?.systems, issuesData?.data, systems]);

  const issues = issuesData?.data ?? [];

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
    generatingReport,
    generateSystemsReport,
    responsibleOptions,
    responsiblesWarning,
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
    setPage: (value: number) => dispatch({ type: 'SET_PAGE', payload: value }),
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
    if (['HIGH', 'CRITICAL'].includes(issue.severity)) {
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
