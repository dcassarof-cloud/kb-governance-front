import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  UserPlus,
  Loader2,
  Eye,
  ClipboardCheck,
  CalendarClock,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { MetricCard } from '@/components/shared/MetricCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { EmptyState } from '@/components/shared/EmptyState';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { governanceService, IssuesFilter } from '@/services/governance.service';
import { systemsService } from '@/services/systems.service';
import {
  GovernanceIssueDto,
  GovernanceOverviewDto,
  IssueSeverity,
  IssueStatus,
  IssueType,
  KbSystem,
  PaginatedResponse,
  GovernanceResponsible,
  GovernanceOverviewSystemDto,
} from '@/types';
import { toast } from '@/hooks/use-toast';
import { config } from '@/config/app-config';
import { governanceTexts } from '@/governanceTexts';

const ALLOWED_ISSUE_TYPES: IssueType[] = [
  'REVIEW_REQUIRED',
  'NOT_AI_READY',
  'DUPLICATE_CONTENT',
  'INCOMPLETE_CONTENT',
];

const ISSUE_TYPE_LABELS: Record<IssueType, string> = governanceTexts.issueTypes;

const ISSUE_STATUS_OPTIONS: IssueStatus[] = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'IGNORED'];
const ISSUE_STATUS_FILTER_OPTIONS: IssueStatus[] = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'IGNORED'];
const ISSUE_SEVERITY_OPTIONS: IssueSeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

type GovernanceFilters = IssuesFilter & {
  overdue?: boolean;
  unassigned?: boolean;
};

export default function GovernancePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [overview, setOverview] = useState<GovernanceOverviewDto | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState<string | null>(null);

  const [issuesData, setIssuesData] = useState<PaginatedResponse<GovernanceIssueDto> | null>(null);
  const [issuesLoading, setIssuesLoading] = useState(true);
  const [issuesError, setIssuesError] = useState<string | null>(null);

  const [systems, setSystems] = useState<KbSystem[]>([]);

  // ✅ paginação 1-based (front)
  const [page, setPage] = useState(1);
  const [size] = useState(config.defaultPageSize);

  // ✅ filtros simples alinhados com backend atual
  const [filters, setFilters] = useState<GovernanceFilters>({
    systemCode: '',
    status: undefined,
    type: undefined,
    severity: undefined,
    responsible: '',
    q: '',
    overdue: false,
    unassigned: false,
  });

  const [assignTarget, setAssignTarget] = useState<GovernanceIssueDto | null>(null);
  const [assignValue, setAssignValue] = useState('');
  const [assignResponsibleType, setAssignResponsibleType] = useState('USER');
  const [assignResponsibleId, setAssignResponsibleId] = useState('');
  const [assignDueDate, setAssignDueDate] = useState('');
  const [actionLoading, setActionLoading] = useState<{ id: string; action: string } | null>(null);
  const [suggestedLoading, setSuggestedLoading] = useState(false);
  const [suggestedError, setSuggestedError] = useState<string | null>(null);
  const [suggestedAssignee, setSuggestedAssignee] = useState<GovernanceResponsible | null>(null);
  const [suggestedAlternatives, setSuggestedAlternatives] = useState<GovernanceResponsible[]>([]);

  const [statusTarget, setStatusTarget] = useState<GovernanceIssueDto | null>(null);
  const [statusValue, setStatusValue] = useState<IssueStatus>('OPEN');
  const [statusIgnoredReason, setStatusIgnoredReason] = useState('');

  const fetchOverview = async () => {
    setOverviewLoading(true);
    setOverviewError(null);
    try {
      const result = await governanceService.getOverview();
      setOverview(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : governanceTexts.governance.summary.loadError;
      setOverviewError(message);
      toast({ title: governanceTexts.general.errorTitle, description: message, variant: 'destructive' });
    } finally {
      setOverviewLoading(false);
    }
  };

  const fetchIssues = async (currentFilters = filters, currentPage = page) => {
    setIssuesLoading(true);
    setIssuesError(null);
    try {
      const result = await governanceService.listIssues({
        page: currentPage,
        size,
        systemCode: currentFilters.systemCode || undefined,
        status: currentFilters.status || undefined,
        type: currentFilters.type || undefined,
        severity: currentFilters.severity || undefined,
        responsible: currentFilters.responsible?.trim() || undefined,
        q: currentFilters.q?.trim() || undefined,
        overdue: currentFilters.overdue || undefined,
        unassigned: currentFilters.unassigned || undefined,
      });

      const normalized: PaginatedResponse<GovernanceIssueDto> = {
        data: Array.isArray(result?.data) ? result.data : [],
        total: result?.total ?? 0,
        page: result?.page ?? currentPage,
        size: result?.size ?? size,
        totalPages: result?.totalPages ?? 0,
      };

      setIssuesData(normalized);
    } catch (err) {
      const message = err instanceof Error ? err.message : governanceTexts.governance.toasts.loadError;
      setIssuesError(message);
      toast({ title: governanceTexts.general.errorTitle, description: message, variant: 'destructive' });
    } finally {
      setIssuesLoading(false);
    }
  };

  const fetchSystems = async () => {
    try {
      const result = await systemsService.getSystems();
      setSystems(Array.isArray(result) ? result : []);
    } catch {
      setSystems([]);
    }
  };

  useEffect(() => {
    fetchOverview();
    fetchSystems();
    // carrega primeira vez
    fetchIssues(filters, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const responsible = searchParams.get('responsible') ?? '';
    const assignTo = searchParams.get('assignTo') ?? '';
    const assignIssueId = searchParams.get('assignIssueId') ?? '';
    const systemCode = searchParams.get('system') ?? '';
    const status = searchParams.get('status') ?? '';
    const type = searchParams.get('type') ?? '';
    const severity = searchParams.get('severity') ?? '';
    const q = searchParams.get('q') ?? '';
    const overdue = searchParams.get('overdue') === 'true';
    const unassigned = searchParams.get('unassigned') === 'true';
    const pageParam = Number(searchParams.get('page') ?? '1');

    setFilters((prev) => ({
      ...prev,
      responsible,
      systemCode,
      status: status ? (status as IssueStatus) : undefined,
      type: type ? (type as IssueType) : undefined,
      severity: severity ? (severity as IssueSeverity) : undefined,
      q,
      overdue,
      unassigned,
    }));
    setPage(Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1);

    if (assignTo) {
      setAssignValue(assignTo);
      setAssignResponsibleId(assignTo);
    }

    if (assignIssueId) {
      governanceService
        .getIssueById(assignIssueId)
        .then((issue) => setAssignTarget(issue))
        .catch((err) => {
          const message =
            err instanceof Error ? err.message : governanceTexts.governance.toasts.loadError;
          toast({ title: governanceTexts.general.errorTitle, description: message, variant: 'destructive' });
        });
    }
  }, [searchParams]);

  // ✅ debounce para busca/filtros e paginação
  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchIssues(filters, page);
    }, 250);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, page]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.systemCode) params.set('system', filters.systemCode);
    if (filters.status) params.set('status', filters.status);
    if (filters.type) params.set('type', filters.type);
    if (filters.severity) params.set('severity', filters.severity);
    if (filters.responsible) params.set('responsible', filters.responsible);
    if (filters.q) params.set('q', filters.q);
    if (filters.overdue) params.set('overdue', 'true');
    if (filters.unassigned) params.set('unassigned', 'true');
    if (page > 1) params.set('page', String(page));

    if (params.toString() !== searchParams.toString()) {
      setSearchParams(params, { replace: true });
    }
  }, [filters, page, searchParams, setSearchParams]);

  useEffect(() => {
    if (!assignTarget) {
      setSuggestedAssignee(null);
      setSuggestedAlternatives([]);
      setSuggestedError(null);
      setSuggestedLoading(false);
      setAssignDueDate('');
      setAssignResponsibleId('');
      setAssignResponsibleType('USER');
      return;
    }
    const assignTo = searchParams.get('assignTo');
    const fallbackResponsible = assignTarget.responsibleName ?? assignTarget.responsible ?? '';
    setAssignValue(assignTo ?? fallbackResponsible);
    setAssignResponsibleId(assignTo ?? assignTarget.responsibleId ?? fallbackResponsible);
    fetchSuggestedAssignee(assignTarget);
  }, [assignTarget, searchParams]);

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

  const issues = issuesData?.data ?? [];

  const systemOptions = useMemo(() => {
    // se vier do endpoint de sistemas, melhor
    if (systems.length > 0) {
      return systems.map((system) => system?.code).filter(Boolean) as string[];
    }
    // fallback: extrai do retorno das issues
    return uniqueOptions(issues.map((issue) => issue?.systemCode));
  }, [issues, systems]);

  const statusOptions = useMemo(() => uniqueOptions(issues.map((issue) => issue?.status)), [issues]);
  const typeOptions = useMemo(() => uniqueOptions(issues.map((issue) => issue?.type)), [issues]);
  const resolvedStatusOptions = statusOptions.length > 0 ? statusOptions : ISSUE_STATUS_FILTER_OPTIONS;
  const resolvedTypeOptions = typeOptions.length > 0 ? typeOptions : ALLOWED_ISSUE_TYPES;
  const resolvedSeverityOptions = ISSUE_SEVERITY_OPTIONS;

  const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return governanceTexts.general.notAvailable;
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR');
    } catch {
      return governanceTexts.general.notAvailable;
    }
  };

  const getDueDateValue = (issue: GovernanceIssueDto) => issue.slaDueAt ?? issue.dueDate ?? null;

  const startOfToday = () => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  };

  const getSlaStatus = (issue: GovernanceIssueDto) => {
    const dueDateValue = getDueDateValue(issue);
    if (!dueDateValue) {
      return {
        label: governanceTexts.governance.statusLabels.noDueDate,
        variant: 'secondary' as const,
        className: 'bg-muted text-muted-foreground',
        priority: 3,
      };
    }

    const dueDate = new Date(dueDateValue);
    if (Number.isNaN(dueDate.getTime())) {
      return {
        label: governanceTexts.governance.statusLabels.noDueDate,
        variant: 'secondary' as const,
        className: 'bg-muted text-muted-foreground',
        priority: 3,
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
      };
    }
    if (due.getTime() === today.getTime()) {
      return {
        label: governanceTexts.governance.statusLabels.dueToday,
        variant: 'secondary' as const,
        className: 'bg-warning text-warning-foreground',
        priority: 1,
      };
    }
    return {
      label: governanceTexts.governance.statusLabels.onTrack,
      variant: 'secondary' as const,
      className: 'bg-success text-success-foreground',
      priority: 2,
    };
  };

  const updateIssueState = (issueId: string, updates: Partial<GovernanceIssueDto>) => {
    setIssuesData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        data: prev.data.map((issue) => (issue.id === issueId ? { ...issue, ...updates } : issue)),
      };
    });
  };

  const handleAssign = async (
    issue: GovernanceIssueDto,
    responsible: string,
    options: { dueDate?: string; createTicket?: boolean; responsibleType?: string; responsibleId?: string } = {}
  ) => {
    const previousResponsible = issue.responsible ?? null;
    updateIssueState(issue.id, { responsible });
    setActionLoading({ id: issue.id, action: 'assign' });
    try {
      const updated = await governanceService.assignIssue(issue.id, responsible, options);
      updateIssueState(issue.id, {
        responsible: updated?.responsible ?? responsible,
        responsibleId: updated?.responsibleId ?? options.responsibleId ?? issue.responsibleId,
        responsibleType: updated?.responsibleType ?? options.responsibleType ?? issue.responsibleType,
        responsibleName: updated?.responsibleName ?? issue.responsibleName,
      });
      toast({ title: governanceTexts.general.update, description: governanceTexts.governance.assignDialog.success });
      await fetchOverview();
    } catch (err) {
      const message = err instanceof Error ? err.message : governanceTexts.governance.toasts.assignError;
      updateIssueState(issue.id, { responsible: previousResponsible });
      toast({ title: governanceTexts.general.errorTitle, description: message, variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const fetchSuggestedAssignee = async (issue: GovernanceIssueDto) => {
    setSuggestedLoading(true);
    setSuggestedError(null);
    setSuggestedAssignee(null);
    setSuggestedAlternatives([]);
    try {
      const result = await governanceService.getSuggestedAssignee(issue.id);
      setSuggestedAssignee(result?.suggested ?? null);
      setSuggestedAlternatives(result?.alternatives ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : governanceTexts.governance.toasts.suggestionError;
      setSuggestedError(message);
    } finally {
      setSuggestedLoading(false);
    }
  };

  const handleStatusChange = async (issue: GovernanceIssueDto, status: IssueStatus, ignoredReason?: string) => {
    const previousStatus = issue.status;
    updateIssueState(issue.id, { status });
    setActionLoading({ id: issue.id, action: 'status' });
    try {
      const updated = await governanceService.changeStatus(issue.id, status, ignoredReason);
      const nextStatus = updated?.status ?? status;
      setIssuesData((prev) => {
        if (!prev) return prev;
        const nextData = prev.data.map((item) =>
          item.id === issue.id ? { ...item, status: nextStatus } : item
        );
        if (filters.status && filters.status !== nextStatus) {
          return {
            ...prev,
            data: nextData.filter((item) => item.id !== issue.id),
            total: Math.max(prev.total - 1, 0),
          };
        }
        return { ...prev, data: nextData };
      });
      toast({ title: governanceTexts.general.update, description: governanceTexts.governance.statusDialog.success });
      await fetchOverview();
    } catch (err) {
      const message = err instanceof Error ? err.message : governanceTexts.governance.toasts.statusError;
      updateIssueState(issue.id, { status: previousStatus });
      toast({ title: governanceTexts.general.errorTitle, description: message, variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleFilterChange = (key: keyof GovernanceFilters, value: string) => {
    // sempre resetar pagina ao filtrar
    setPage(1);
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleToggleChange = (key: 'overdue' | 'unassigned', value: boolean) => {
    setPage(1);
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const formatInputDate = (date: Date) => {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const renderResponsibleLabel = (responsible: GovernanceResponsible | null) => {
    if (!responsible) return '';
    const pending = responsible.pendingIssues ?? responsible.openIssues;
    return typeof pending === 'number' ? governanceTexts.governance.list.count(pending) : '';
  };

  const totalPages = issuesData?.totalPages ?? 0;
  const isValidNumber = (value: number | null | undefined) => typeof value === 'number' && Number.isFinite(value);

  const summaryMetrics = [
    {
      key: 'openTotal',
      title: governanceTexts.governance.summary.openTotal,
      value: overview?.openTotal,
      icon: AlertCircle,
      variant: 'warning' as const,
    },
    {
      key: 'errorOpen',
      title: governanceTexts.governance.summary.errorOpen,
      value: overview?.errorOpen ?? overview?.criticalOpen,
      icon: AlertTriangle,
      variant: 'error' as const,
    },
    {
      key: 'unassignedOpen',
      title: governanceTexts.governance.summary.unassignedOpen,
      value: overview?.unassignedOpen,
      icon: UserPlus,
      variant: 'warning' as const,
    },
    {
      key: 'overdueOpen',
      title: governanceTexts.governance.summary.overdueOpen,
      value: overview?.overdueOpen,
      icon: CalendarClock,
      variant: 'error' as const,
    },
  ].filter((metric) => isValidNumber(metric.value));

  const severityRank: Record<IssueSeverity, number> = {
    CRITICAL: 0,
    HIGH: 1,
    MEDIUM: 2,
    LOW: 3,
  };

  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      if (filters.unassigned && issue.responsible) return false;
      if (filters.overdue) {
        const dueDateValue = getDueDateValue(issue);
        if (!dueDateValue) return false;
        const dueDate = new Date(dueDateValue);
        if (Number.isNaN(dueDate.getTime())) return false;
        const today = startOfToday();
        dueDate.setHours(0, 0, 0, 0);
        if (dueDate >= today) return false;
      }
      return true;
    });
  }, [filters.overdue, filters.unassigned, issues]);

  const orderedIssues = useMemo(() => {
    return [...filteredIssues].sort((a, b) => {
      const slaA = getSlaStatus(a);
      const slaB = getSlaStatus(b);
      if (slaA.priority !== slaB.priority) {
        return slaA.priority - slaB.priority;
      }
      const severityA = severityRank[a.severity] ?? 99;
      const severityB = severityRank[b.severity] ?? 99;
      if (severityA !== severityB) {
        return severityA - severityB;
      }
      const dateA = getDueDateValue(a) ? new Date(getDueDateValue(a) as string).getTime() : Number.POSITIVE_INFINITY;
      const dateB = getDueDateValue(b) ? new Date(getDueDateValue(b) as string).getTime() : Number.POSITIVE_INFINITY;
      return dateA - dateB;
    });
  }, [filteredIssues]);

  const systemRows = useMemo(() => {
    if (overview?.systems && overview.systems.length > 0) {
      return overview.systems;
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
      const dueDateValue = getDueDateValue(issue);
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
  }, [overview?.systems, issues, systems]);

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

  return (
    <MainLayout>
      <PageHeader title={governanceTexts.governance.title} description={governanceTexts.governance.description} />

      {/* ------------------ FILTROS ------------------ */}
      <div className="card-metric mb-6">
        <h3 className="font-semibold mb-4">{governanceTexts.governance.filtersTitle}</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>{governanceTexts.governance.filters.type}</Label>
            <Select
              value={filters.type || 'ALL'}
              onValueChange={(value) => handleFilterChange('type', value === 'ALL' ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={governanceTexts.governance.filters.typePlaceholder} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{governanceTexts.governance.filters.typePlaceholder}</SelectItem>
                {resolvedTypeOptions.map((type) => (
                  <SelectItem key={type} value={type}>
                    {ISSUE_TYPE_LABELS[type] || type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label>{governanceTexts.governance.filters.severity}</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-xs text-muted-foreground cursor-help">?</span>
                  </TooltipTrigger>
                  <TooltipContent>{governanceTexts.severity.tooltip}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Select
              value={filters.severity || 'ALL'}
              onValueChange={(value) => handleFilterChange('severity', value === 'ALL' ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={governanceTexts.governance.filters.severityPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{governanceTexts.governance.filters.severityPlaceholder}</SelectItem>
                {resolvedSeverityOptions.map((severity) => (
                  <SelectItem key={severity} value={severity}>
                    {governanceTexts.severity.labels[severity]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{governanceTexts.governance.filters.system}</Label>
            <Select
              value={filters.systemCode || 'ALL'}
              onValueChange={(value) => handleFilterChange('systemCode', value === 'ALL' ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={governanceTexts.governance.filters.systemPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{governanceTexts.governance.filters.systemPlaceholder}</SelectItem>
                {systemOptions.map((system) => (
                  <SelectItem key={system} value={system}>
                    {system}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{governanceTexts.governance.filters.status}</Label>
            <Select
              value={filters.status || 'ALL'}
              onValueChange={(value) => handleFilterChange('status', value === 'ALL' ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={governanceTexts.governance.filters.statusPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{governanceTexts.governance.filters.statusPlaceholder}</SelectItem>
                {resolvedStatusOptions.map((status) => (
                  <SelectItem key={status} value={status}>
                    {governanceTexts.status.labels[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{governanceTexts.governance.filters.search}</Label>
            <Input
              placeholder={governanceTexts.governance.filters.searchPlaceholder}
              value={filters.q || ''}
              onChange={(event) => handleFilterChange('q', event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>{governanceTexts.governance.filters.responsible}</Label>
            <Input
              placeholder={governanceTexts.governance.filters.responsiblePlaceholder}
              value={filters.responsible || ''}
              onChange={(event) => handleFilterChange('responsible', event.target.value)}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="filter-overdue"
              checked={Boolean(filters.overdue)}
              onCheckedChange={(checked) => handleToggleChange('overdue', Boolean(checked))}
            />
            <Label htmlFor="filter-overdue" className="text-sm font-medium">
              {governanceTexts.governance.filters.overdue}
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="filter-unassigned"
              checked={Boolean(filters.unassigned)}
              onCheckedChange={(checked) => handleToggleChange('unassigned', Boolean(checked))}
            />
            <Label htmlFor="filter-unassigned" className="text-sm font-medium">
              {governanceTexts.governance.filters.unassigned}
            </Label>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setPage(1);
              setFilters({
                systemCode: '',
                status: undefined,
                type: undefined,
                severity: undefined,
                responsible: '',
                q: '',
                overdue: false,
                unassigned: false,
              });
            }}
          >
            {governanceTexts.general.clearFilters}
          </Button>

          <Button variant="secondary" onClick={() => fetchIssues(filters, page)}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {governanceTexts.general.refreshList}
          </Button>
        </div>
      </div>

      {/* ------------------ SUMMARY ------------------ */}
      {overviewLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((item) => (
            <LoadingSkeleton key={item} variant="card" />
          ))}
        </div>
      ) : overviewError ? (
        <div className="card-metric mb-6">
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <AlertCircle className="h-10 w-10 text-destructive mb-3" />
            <h3 className="font-semibold text-lg mb-2">{governanceTexts.governance.summary.loadError}</h3>
            <p className="text-sm text-muted-foreground mb-4">{overviewError}</p>
            <Button onClick={fetchOverview}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {governanceTexts.general.retry}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mb-6">
          {summaryMetrics.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {summaryMetrics.map((metric) => (
                <MetricCard
                  key={metric.key}
                  title={metric.title}
                  value={metric.value as number}
                  icon={metric.icon}
                  variant={metric.variant}
                />
              ))}
            </div>
          ) : (
            <div className="card-metric">
              <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
                <AlertCircle className="h-10 w-10 mb-2" />
                <p className="text-sm">{governanceTexts.governance.summary.empty}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------ SISTEMAS ------------------ */}
      <div className="card-metric mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold">{governanceTexts.governance.systems.title}</h3>
            <p className="text-sm text-muted-foreground">{governanceTexts.governance.systems.subtitle}</p>
          </div>
        </div>

        {overviewLoading ? (
          <LoadingSkeleton variant="table" rows={4} />
        ) : overviewError ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h3 className="font-semibold text-lg mb-2">{governanceTexts.governance.systems.loadError}</h3>
            <p className="text-sm text-muted-foreground mb-4">{overviewError}</p>
            <Button onClick={fetchOverview}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {governanceTexts.general.retry}
            </Button>
          </div>
        ) : systemRows.length === 0 ? (
          <EmptyState
            icon={AlertTriangle}
            title={governanceTexts.governance.systems.emptyTitle}
            description={governanceTexts.governance.systems.emptyDescription}
          />
        ) : (
          <div className="table-container overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-semibold text-sm">{governanceTexts.governance.systems.table.system}</th>
                  <th className="text-left p-4 font-semibold text-sm">{governanceTexts.governance.systems.table.healthScore}</th>
                  <th className="text-left p-4 font-semibold text-sm">{governanceTexts.governance.systems.table.open}</th>
                  <th className="text-left p-4 font-semibold text-sm">{governanceTexts.governance.systems.table.critical}</th>
                  <th className="text-left p-4 font-semibold text-sm">{governanceTexts.governance.systems.table.overdue}</th>
                  <th className="text-left p-4 font-semibold text-sm">{governanceTexts.governance.systems.table.unassigned}</th>
                </tr>
              </thead>
              <tbody>
                {systemRows.map((system) => {
                  const score = typeof system.healthScore === 'number' ? Math.round(system.healthScore) : null;
                  return (
                    <tr
                      key={system.systemCode}
                      className="border-t border-border hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => handleFilterChange('systemCode', system.systemCode)}
                    >
                      <td className="p-4 font-medium">
                        <div>{system.systemName || system.systemCode}</div>
                        <div className="text-xs text-muted-foreground">{system.systemCode}</div>
                      </td>
                      <td className="p-4">
                        {score !== null ? (
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-24 rounded-full bg-muted">
                              <div
                                className="h-2 rounded-full bg-primary"
                                style={{ width: `${Math.min(score, 100)}%` }}
                              />
                            </div>
                            <span className="text-sm text-muted-foreground">{score}%</span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">{governanceTexts.general.notAvailable}</span>
                        )}
                      </td>
                      <td className="p-4 text-muted-foreground">{system.openIssues ?? 0}</td>
                      <td className="p-4 text-muted-foreground">{system.errorOpen ?? 0}</td>
                      <td className="p-4 text-muted-foreground">{system.overdueOpen ?? 0}</td>
                      <td className="p-4 text-muted-foreground">{system.unassignedOpen ?? 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ------------------ LISTA ------------------ */}
      <div className="card-metric">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">{governanceTexts.governance.list.title}</h3>
          <span className="text-sm text-muted-foreground">
            {governanceTexts.governance.list.count(orderedIssues.length)}
          </span>
        </div>

        {issuesLoading ? (
          <LoadingSkeleton variant="table" rows={5} />
        ) : issuesError ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h3 className="font-semibold text-lg mb-2">{governanceTexts.governance.list.loadError}</h3>
            <p className="text-sm text-muted-foreground mb-4">{issuesError}</p>
            <Button onClick={() => fetchIssues(filters, page)}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {governanceTexts.general.retry}
            </Button>
          </div>
        ) : orderedIssues.length === 0 ? (
          <EmptyState
            icon={AlertTriangle}
            title={governanceTexts.governance.list.emptyTitle}
            description={governanceTexts.governance.list.emptyDescription}
          />
        ) : (
          <div className="table-container overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-semibold text-sm">{governanceTexts.governance.list.table.issue}</th>
                  <th className="text-left p-4 font-semibold text-sm">{governanceTexts.governance.list.table.situation}</th>
                  <th className="text-left p-4 font-semibold text-sm">{governanceTexts.governance.list.table.responsible}</th>
                  <th className="text-left p-4 font-semibold text-sm">{governanceTexts.governance.list.table.overdue}</th>
                  <th className="text-left p-4 font-semibold text-sm">{governanceTexts.governance.list.table.actions}</th>
                </tr>
              </thead>

              <tbody>
                {orderedIssues.map((issue, index) => {
                  const issueId = issue?.id || `issue-${index}`;
                  const system = issue?.systemName || issue?.systemCode || governanceTexts.general.notAvailable;
                  const manualTitle = issue?.articleTitle || issue?.title || governanceTexts.general.notAvailable;
                  const manualDetails = issue?.message || issue?.details || '';
                  const status = issue?.status || 'OPEN';
                  const responsible = issue?.responsibleName || issue?.responsible || governanceTexts.general.notAvailable;
                  const slaStatus = getSlaStatus(issue);
                  const dueDate = formatDate(getDueDateValue(issue));
                  const overdueDays = getOverdueDays(issue);
                  const situationSummary = `${getShortSeverityLabel(issue.severity)} – ${getStatusLabel(status)}${
                    overdueDays ? ` há ${overdueDays} dia${overdueDays !== 1 ? 's' : ''}` : ''
                  }`;

                  const isActionLoading = (action: string) => actionLoading?.id === issueId && actionLoading?.action === action;

                  return (
                    <tr key={issueId} className="border-t border-border hover:bg-muted/30 transition-colors">
                      <td className="p-4">
                        <div className="space-y-2">
                          <Badge variant="secondary">{issue?.displayName || ISSUE_TYPE_LABELS[issue?.type] || issue?.type || governanceTexts.general.notAvailable}</Badge>
                          <div className="text-sm text-muted-foreground">{system}</div>
                          <div className="font-medium">{manualTitle}</div>
                          {manualDetails && (
                            <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{manualDetails}</div>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-2">
                          <StatusBadge status={issue.severity || 'LOW'} />
                          <span className="text-xs text-muted-foreground">{situationSummary}</span>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">{responsible}</td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          <Badge variant={slaStatus.variant} className={slaStatus.className}>
                            {slaStatus.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{dueDate}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-2">
                          <Button variant="outline" size="sm" onClick={() => setAssignTarget(issue)}>
                            <UserPlus className="h-4 w-4 mr-1" />
                            {governanceTexts.governance.list.actionAssign}
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setStatusTarget(issue);
                              setStatusValue(issue.status || 'OPEN');
                              setStatusIgnoredReason('');
                            }}
                            disabled={isActionLoading('status')}
                          >
                            <ClipboardCheck className="h-4 w-4 mr-1" />
                            {governanceTexts.governance.list.actionStatus}
                          </Button>

                          <Button variant="ghost" size="sm" onClick={() => navigate(`/governance/issues/${issue.id}`)}>
                            <Eye className="h-4 w-4 mr-1" />
                            {governanceTexts.governance.list.actionDetail}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ------------------ PAGINAÇÃO ------------------ */}
      {!issuesLoading && !issuesError && totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            {governanceTexts.general.page(page, totalPages)}
          </p>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
              {governanceTexts.general.previous}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              {governanceTexts.general.next}
            </Button>
          </div>
        </div>
      )}

      {/* ------------------ DIALOG STATUS ------------------ */}
      <Dialog
        open={Boolean(statusTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setStatusTarget(null);
            setStatusIgnoredReason('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{governanceTexts.governance.statusDialog.title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{governanceTexts.governance.statusDialog.statusLabel}</Label>
              <Select
                value={statusValue}
                onValueChange={(value) => setStatusValue(value as IssueStatus)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={governanceTexts.governance.statusDialog.statusPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {ISSUE_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {governanceTexts.status.labels[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {statusValue === 'IGNORED' && (
              <div className="space-y-2">
                <Label>{governanceTexts.governance.statusDialog.ignoredReasonLabel}</Label>
                <Input
                  placeholder={governanceTexts.governance.statusDialog.ignoredReasonPlaceholder}
                  value={statusIgnoredReason}
                  onChange={(event) => setStatusIgnoredReason(event.target.value)}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusTarget(null)}>
              {governanceTexts.governance.statusDialog.cancel}
            </Button>
            <Button
              onClick={() => {
                if (!statusTarget) return;
                if (statusValue === 'IGNORED' && !statusIgnoredReason.trim()) {
                  toast({
                    title: governanceTexts.general.attentionTitle,
                    description: governanceTexts.governance.statusDialog.ignoredReasonRequired,
                  });
                  return;
                }
                handleStatusChange(statusTarget, statusValue, statusValue === 'IGNORED' ? statusIgnoredReason.trim() : undefined);
                setStatusTarget(null);
                setStatusIgnoredReason('');
              }}
              disabled={Boolean(statusTarget && actionLoading?.action === 'status')}
            >
              {actionLoading?.action === 'status' ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {governanceTexts.governance.statusDialog.saving}
                </span>
              ) : (
                governanceTexts.governance.statusDialog.save
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ------------------ DIALOG ATRIBUIR ------------------ */}
      <Dialog
        open={Boolean(assignTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setAssignTarget(null);
            setAssignValue('');
            setAssignDueDate('');
            setAssignResponsibleId('');
            setAssignResponsibleType('USER');
            setSuggestedAssignee(null);
            setSuggestedAlternatives([]);
            setSuggestedError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{governanceTexts.governance.assignDialog.title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">{governanceTexts.governance.assignDialog.suggestionTitle}</h4>
                {suggestedLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              </div>

              {suggestedError ? (
                <div className="text-sm text-destructive">{suggestedError}</div>
              ) : suggestedLoading ? (
                <div className="text-sm text-muted-foreground">{governanceTexts.governance.assignDialog.suggestionLoading}</div>
              ) : suggestedAssignee ? (
                <Button
                  className="w-full justify-between text-base"
                  onClick={() => {
                    if (!assignTarget || !suggestedAssignee) return;
                    const responsibleId = suggestedAssignee.id ?? suggestedAssignee.name;
                    handleAssign(assignTarget, suggestedAssignee.name, {
                      dueDate: assignDueDate || undefined,
                      responsibleType: assignResponsibleType,
                      responsibleId,
                    });
                    setAssignTarget(null);
                    setAssignValue('');
                    setAssignResponsibleId('');
                  }}
                >
                  <span>{governanceTexts.governance.assignDialog.assignTo(suggestedAssignee.name)}</span>
                  {renderResponsibleLabel(suggestedAssignee) && (
                    <span className="text-xs opacity-80">{renderResponsibleLabel(suggestedAssignee)}</span>
                  )}
                </Button>
              ) : (
                <div className="text-sm text-muted-foreground">{governanceTexts.governance.assignDialog.suggestionEmpty}</div>
              )}

              {!suggestedLoading && suggestedAlternatives.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {governanceTexts.governance.assignDialog.alternativesTitle}
                  </p>
                  <div className="space-y-2">
                    {suggestedAlternatives.slice(0, 3).map((option, index) => {
                      const pending = option.pendingIssues ?? option.openIssues ?? null;
                      return (
                        <button
                          key={`${option.name}-${index}`}
                          type="button"
                          onClick={() => {
                            setAssignValue(option.name);
                            setAssignResponsibleId(option.id ?? option.name);
                          }}
                          className="w-full rounded-md border border-border px-3 py-2 text-left text-sm hover:bg-muted/50 transition"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{option.name}</span>
                            {typeof pending === 'number' && (
                              <span className="text-xs text-muted-foreground">{pending} pendências</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>{governanceTexts.governance.assignDialog.responsibleLabel}</Label>
              <Input
                placeholder={governanceTexts.governance.assignDialog.responsiblePlaceholder}
                value={assignValue}
                onChange={(event) => setAssignValue(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>{governanceTexts.governance.assignDialog.responsibleTypeLabel}</Label>
              <Select
                value={assignResponsibleType}
                onValueChange={(value) => setAssignResponsibleType(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={governanceTexts.governance.assignDialog.responsibleTypePlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">{governanceTexts.governance.assignDialog.responsibleTypeOptions.USER}</SelectItem>
                  <SelectItem value="TEAM">{governanceTexts.governance.assignDialog.responsibleTypeOptions.TEAM}</SelectItem>
                  <SelectItem value="ROLE">{governanceTexts.governance.assignDialog.responsibleTypeOptions.ROLE}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{governanceTexts.governance.assignDialog.responsibleIdLabel}</Label>
              <Input
                placeholder={governanceTexts.governance.assignDialog.responsibleIdPlaceholder}
                value={assignResponsibleId}
                onChange={(event) => setAssignResponsibleId(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>{governanceTexts.governance.assignDialog.dueDateLabel}</Label>
              <Input
                type="date"
                value={assignDueDate}
                onChange={(event) => setAssignDueDate(event.target.value)}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setAssignDueDate(formatInputDate(new Date()))}
                >
                  {governanceTexts.governance.assignDialog.quickDateToday}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const date = new Date();
                    date.setDate(date.getDate() + 3);
                    setAssignDueDate(formatInputDate(date));
                  }}
                >
                  {governanceTexts.governance.assignDialog.quickDateThreeDays}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const date = new Date();
                    date.setDate(date.getDate() + 7);
                    setAssignDueDate(formatInputDate(date));
                  }}
                >
                  {governanceTexts.governance.assignDialog.quickDateSevenDays}
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAssignTarget(null);
                setAssignValue('');
                setAssignDueDate('');
                setAssignResponsibleId('');
                setAssignResponsibleType('USER');
              }}
            >
              {governanceTexts.governance.assignDialog.cancel}
            </Button>

            <Button
              onClick={() => {
                if (!assignTarget) return;
                const trimmedId = assignResponsibleId.trim();
                const trimmedName = assignValue.trim();
                if (!trimmedId) {
                  toast({
                    title: governanceTexts.general.attentionTitle,
                    description: governanceTexts.governance.assignDialog.missingResponsibleId,
                  });
                  return;
                }
                handleAssign(assignTarget, trimmedName || trimmedId, {
                  dueDate: assignDueDate || undefined,
                  responsibleType: assignResponsibleType,
                  responsibleId: trimmedId,
                });
                setAssignTarget(null);
                setAssignValue('');
                setAssignResponsibleId('');
              }}
              disabled={Boolean(assignTarget && actionLoading?.action === 'assign')}
            >
              {actionLoading?.action === 'assign' ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {governanceTexts.governance.assignDialog.saving}
                </span>
              ) : (
                governanceTexts.governance.assignDialog.save
              )}
            </Button>

            <Button
              variant="secondary"
              onClick={() => {
                if (!assignTarget) return;
                const trimmedId = assignResponsibleId.trim();
                const trimmedName = assignValue.trim();
                if (!trimmedId) {
                  toast({
                    title: governanceTexts.general.attentionTitle,
                    description: governanceTexts.governance.assignDialog.missingResponsibleId,
                  });
                  return;
                }
                handleAssign(assignTarget, trimmedName || trimmedId, {
                  dueDate: assignDueDate || undefined,
                  createTicket: true,
                  responsibleType: assignResponsibleType,
                  responsibleId: trimmedId,
                });
                setAssignTarget(null);
                setAssignValue('');
                setAssignResponsibleId('');
              }}
              disabled={Boolean(assignTarget && actionLoading?.action === 'assign')}
            >
              {governanceTexts.governance.assignDialog.saveWithTicket}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </MainLayout>
  );
}
