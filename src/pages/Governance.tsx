import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  CheckCircle,
  UserPlus,
  History,
  Loader2,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { MetricCard } from '@/components/shared/MetricCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { EmptyState } from '@/components/shared/EmptyState';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { governanceService, IssuesFilter } from '@/services/governance.service';
import { systemsService } from '@/services/systems.service';
import {
  GovernanceIssue,
  GovernanceSummary,
  IssueSeverity,
  IssueStatus,
  IssueType,
  KbSystem,
  PaginatedResponse,
  GovernanceResponsible,
} from '@/types';
import { toast } from '@/hooks/use-toast';
import { config } from '@/config/app-config';

const ISSUE_TYPE_LABELS: Record<string, string> = {
  INCOMPLETE_CONTENT: 'Conteúdo Incompleto',
  DUPLICATE_CONTENT: 'Conteúdo Duplicado',
  OUTDATED_CONTENT: 'Conteúdo Desatualizado',
  INCONSISTENT_CONTENT: 'Conteúdo Inconsistente',
};

const ISSUE_STATUS_OPTIONS: IssueStatus[] = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'IGNORED'];
const ISSUE_SEVERITY_OPTIONS: IssueSeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export default function GovernancePage() {
  const [searchParams] = useSearchParams();
  const [summary, setSummary] = useState<GovernanceSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [issuesData, setIssuesData] = useState<PaginatedResponse<GovernanceIssue> | null>(null);
  const [issuesLoading, setIssuesLoading] = useState(true);
  const [issuesError, setIssuesError] = useState<string | null>(null);

  const [systems, setSystems] = useState<KbSystem[]>([]);

  // ✅ paginação 1-based (front)
  const [page, setPage] = useState(1);
  const [size] = useState(config.defaultPageSize);

  // ✅ filtros simples alinhados com backend atual
  const [filters, setFilters] = useState<IssuesFilter>({
    systemCode: '',
    status: undefined,
    type: undefined,
    severity: undefined,
    responsible: '',
    q: '',
  });

  const [assignTarget, setAssignTarget] = useState<GovernanceIssue | null>(null);
  const [assignValue, setAssignValue] = useState('');
  const [assignDueDate, setAssignDueDate] = useState('');
  const [actionLoading, setActionLoading] = useState<{ id: string; action: string } | null>(null);
  const [suggestedLoading, setSuggestedLoading] = useState(false);
  const [suggestedError, setSuggestedError] = useState<string | null>(null);
  const [suggestedAssignee, setSuggestedAssignee] = useState<GovernanceResponsible | null>(null);
  const [suggestedAlternatives, setSuggestedAlternatives] = useState<GovernanceResponsible[]>([]);

  const [historyTarget, setHistoryTarget] = useState<GovernanceIssue | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<string[]>([]);

  const fetchSummary = async () => {
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const result = await governanceService.getSummary();
      setSummary({
        totalIssues: result?.totalIssues ?? null,
        unassignedIssues: result?.unassignedIssues ?? null,
        openIssues: result?.openIssues ?? null,
        resolvedLast7Days: result?.resolvedLast7Days ?? null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar indicadores';
      console.error('Erro ao carregar indicadores de governança:', err);
      setSummaryError(message);
      toast({ title: 'Erro', description: message, variant: 'destructive' });
    } finally {
      setSummaryLoading(false);
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
      });

      const normalized: PaginatedResponse<GovernanceIssue> = {
        data: Array.isArray(result?.data) ? result.data : [],
        total: result?.total ?? 0,
        page: result?.page ?? currentPage,
        size: result?.size ?? size,
        totalPages: result?.totalPages ?? 0,
      };

      setIssuesData(normalized);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar issues';
      console.error('Erro ao carregar issues de governança:', err);
      setIssuesError(message);
      toast({ title: 'Erro', description: message, variant: 'destructive' });
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
    fetchSummary();
    fetchSystems();
    // carrega primeira vez
    fetchIssues(filters, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const responsible = searchParams.get('responsible');
    const assignTo = searchParams.get('assignTo');
    if (responsible) {
      setFilters((prev) => ({ ...prev, responsible }));
      setPage(1);
    }
    if (assignTo) {
      setAssignValue(assignTo);
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
    if (!assignTarget) {
      setSuggestedAssignee(null);
      setSuggestedAlternatives([]);
      setSuggestedError(null);
      setSuggestedLoading(false);
      setAssignDueDate('');
      return;
    }
    const assignTo = searchParams.get('assignTo');
    setAssignValue(assignTo ?? assignTarget.responsible ?? '');
    fetchSuggestedAssignee(assignTarget);
  }, [assignTarget, searchParams]);

  const uniqueOptions = (values: Array<string | null | undefined>) =>
    Array.from(new Set(values.filter((value): value is string => Boolean(value && value.trim()))));

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
  const resolvedStatusOptions = statusOptions.length > 0 ? statusOptions : ISSUE_STATUS_OPTIONS;
  const resolvedTypeOptions = Object.keys(ISSUE_TYPE_LABELS) as IssueType[];
  const resolvedSeverityOptions = ISSUE_SEVERITY_OPTIONS;

  const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR');
    } catch {
      return '-';
    }
  };

  const updateIssueState = (issueId: string, updates: Partial<GovernanceIssue>) => {
    setIssuesData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        data: prev.data.map((issue) => (issue.id === issueId ? { ...issue, ...updates } : issue)),
      };
    });
  };

  const handleAssign = async (
    issue: GovernanceIssue,
    responsible: string,
    options: { dueDate?: string; createTicket?: boolean } = {}
  ) => {
    const previousResponsible = issue.responsible ?? null;
    updateIssueState(issue.id, { responsible });
    setActionLoading({ id: issue.id, action: 'assign' });
    try {
      const updated = await governanceService.assignIssue(issue.id, responsible, options);
      updateIssueState(issue.id, { responsible: updated?.responsible ?? responsible });
      toast({ title: 'Ação concluída', description: 'Responsável atribuído com sucesso.' });
      await fetchSummary();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao atribuir responsável';
      console.error('Erro ao atribuir responsável:', err);
      updateIssueState(issue.id, { responsible: previousResponsible });
      toast({ title: 'Erro', description: message, variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const fetchSuggestedAssignee = async (issue: GovernanceIssue) => {
    setSuggestedLoading(true);
    setSuggestedError(null);
    setSuggestedAssignee(null);
    setSuggestedAlternatives([]);
    try {
      const result = await governanceService.getSuggestedAssignee(issue.id);
      setSuggestedAssignee(result?.suggested ?? null);
      setSuggestedAlternatives(result?.alternatives ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar sugestão';
      setSuggestedError(message);
    } finally {
      setSuggestedLoading(false);
    }
  };

  const handleStatusChange = async (issue: GovernanceIssue, status: IssueStatus) => {
    const previousStatus = issue.status;
    updateIssueState(issue.id, { status });
    setActionLoading({ id: issue.id, action: 'status' });
    try {
      const updated = await governanceService.changeStatus(issue.id, status);
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
      toast({ title: 'Ação concluída', description: 'Status atualizado com sucesso.' });
      await fetchSummary();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar status';
      console.error('Erro ao atualizar status:', err);
      updateIssueState(issue.id, { status: previousStatus });
      toast({ title: 'Erro', description: message, variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const openHistory = async (issue: GovernanceIssue) => {
    setHistoryTarget(issue);
    setHistoryLoading(true);
    setHistoryError(null);
    setHistoryData([]);
    try {
      const result = await governanceService.getHistory(issue.id);
      const entries = Array.isArray(result) ? result : [];
      const formatted = entries.map((entry) => {
        const date = formatDate(entry?.changedAt);
        const status = entry?.status ?? '-';
        const by = entry?.changedBy ? ` • ${entry.changedBy}` : '';
        const note = entry?.note ? ` — ${entry.note}` : '';
        return `${date} • ${status}${by}${note}`;
      });
      setHistoryData(formatted);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar histórico';
      setHistoryError(message);
      toast({ title: 'Erro', description: message, variant: 'destructive' });
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleFilterChange = (key: keyof IssuesFilter, value: string) => {
    // sempre resetar pagina ao filtrar
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
    return typeof pending === 'number' ? `${pending} pendências` : '';
  };

  const totalPages = issuesData?.totalPages ?? 0;
  const isValidNumber = (value: number | null | undefined) => typeof value === 'number' && Number.isFinite(value);
  // TODO: ampliar quando o backend expor novos indicadores
  const summaryMetrics = [
    {
      key: 'totalIssues',
      title: 'Total de issues',
      value: summary?.totalIssues,
      icon: AlertTriangle,
      variant: 'primary' as const,
    },
    {
      key: 'unassignedIssues',
      title: 'Sem responsável',
      value: summary?.unassignedIssues,
      icon: UserPlus,
      variant: 'warning' as const,
    },
    {
      key: 'openIssues',
      title: 'Abertas',
      value: summary?.openIssues,
      icon: AlertCircle,
      variant: 'warning' as const,
    },
    {
      key: 'resolvedLast7Days',
      title: 'Resolvidas (7d)',
      value: summary?.resolvedLast7Days,
      icon: CheckCircle,
      variant: 'success' as const,
    },
  ].filter((metric) => isValidNumber(metric.value));

  return (
    <MainLayout>
      <PageHeader title="Governança" description="Cockpit operacional da base de conhecimento" />

      {/* ------------------ FILTROS ------------------ */}
      <div className="card-metric mb-6">
        <h3 className="font-semibold mb-4">Filtros avançados</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select
              value={filters.type || 'ALL'}
              onValueChange={(value) => handleFilterChange('type', value === 'ALL' ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos os tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos</SelectItem>
                {resolvedTypeOptions.map((type) => (
                  <SelectItem key={type} value={type}>
                    {ISSUE_TYPE_LABELS[type] || type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Severidade</Label>
            <Select
              value={filters.severity || 'ALL'}
              onValueChange={(value) => handleFilterChange('severity', value === 'ALL' ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas as severidades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas</SelectItem>
                {resolvedSeverityOptions.map((severity) => (
                  <SelectItem key={severity} value={severity}>
                    {severity}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Sistema</Label>
            <Select
              value={filters.systemCode || 'ALL'}
              onValueChange={(value) => handleFilterChange('systemCode', value === 'ALL' ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos os sistemas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos</SelectItem>
                {systemOptions.map((system) => (
                  <SelectItem key={system} value={system}>
                    {system}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={filters.status || 'ALL'}
              onValueChange={(value) => handleFilterChange('status', value === 'ALL' ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos</SelectItem>
                {resolvedStatusOptions.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Busca</Label>
            <Input
              placeholder="Buscar por mensagem ou título"
              value={filters.q || ''}
              onChange={(event) => handleFilterChange('q', event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Responsável</Label>
            <Input
              placeholder="Filtrar por responsável"
              value={filters.responsible || ''}
              onChange={(event) => handleFilterChange('responsible', event.target.value)}
            />
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
              });
            }}
          >
            Limpar filtros
          </Button>

          <Button variant="secondary" onClick={() => fetchIssues(filters, page)}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar lista
          </Button>
        </div>
      </div>

      {/* ------------------ SUMMARY ------------------ */}
      {summaryLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((item) => (
            <LoadingSkeleton key={item} variant="card" />
          ))}
        </div>
      ) : summaryError ? (
        <div className="card-metric mb-6">
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <AlertCircle className="h-10 w-10 text-destructive mb-3" />
            <h3 className="font-semibold text-lg mb-2">Erro ao carregar indicadores</h3>
            <p className="text-sm text-muted-foreground mb-4">{summaryError}</p>
            <Button onClick={fetchSummary}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar novamente
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
                <p className="text-sm">Indicadores indisponíveis no momento.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------ LISTA ------------------ */}
      <div className="card-metric">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Lista de issues</h3>
          <span className="text-sm text-muted-foreground">
            {issuesData?.total ?? 0} issue{(issuesData?.total ?? 0) !== 1 ? 's' : ''}
          </span>
        </div>

        {issuesLoading ? (
          <LoadingSkeleton variant="table" rows={5} />
        ) : issuesError ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h3 className="font-semibold text-lg mb-2">Erro ao carregar issues</h3>
            <p className="text-sm text-muted-foreground mb-4">{issuesError}</p>
            <Button onClick={() => fetchIssues(filters, page)}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar novamente
            </Button>
          </div>
        ) : issues.length === 0 ? (
          <EmptyState
            icon={AlertTriangle}
            title="Nenhuma issue encontrada"
            description="Ajuste os filtros para visualizar as issues pendentes."
          />
        ) : (
          <div className="table-container overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-semibold text-sm">Tipo</th>
                  <th className="text-left p-4 font-semibold text-sm">Severidade</th>
                  <th className="text-left p-4 font-semibold text-sm">Sistema</th>
                  <th className="text-left p-4 font-semibold text-sm">Manual / Resumo</th>
                  <th className="text-left p-4 font-semibold text-sm">Status</th>
                  <th className="text-left p-4 font-semibold text-sm">Responsável</th>
                  <th className="text-left p-4 font-semibold text-sm">Prazo</th>
                  <th className="text-left p-4 font-semibold text-sm">Ações rápidas</th>
                </tr>
              </thead>

              <tbody>
                {issues.map((issue, index) => {
                  const issueId = issue?.id || `issue-${index}`;
                  const system = issue?.systemName || issue?.systemCode || '-';
                  const manualTitle = issue?.articleTitle || issue?.title || 'Manual sem título';
                  const manualDetails = issue?.message || issue?.details || '';
                  const status = issue?.status || 'OPEN';
                  const severity = issue?.severity || 'LOW';
                  const responsible = issue?.responsible || '-';
                  const dueDate = formatDate(issue?.dueDate);

                  const isActionLoading = (action: string) => actionLoading?.id === issueId && actionLoading?.action === action;

                  return (
                    <tr key={issueId} className="border-t border-border hover:bg-muted/30 transition-colors">
                      <td className="p-4">
                        <Badge variant="secondary">{ISSUE_TYPE_LABELS[issue?.type] || issue?.type || '-'}</Badge>
                      </td>
                      <td className="p-4">
                        <StatusBadge status={severity} />
                      </td>
                      <td className="p-4 text-muted-foreground">{system}</td>
                      <td className="p-4">
                        <div className="font-medium">{manualTitle}</div>
                        {manualDetails && (
                          <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{manualDetails}</div>
                        )}
                      </td>
                      <td className="p-4">
                        <Select
                          value={status}
                          onValueChange={(value) => handleStatusChange(issue, value as IssueStatus)}
                          disabled={isActionLoading('status')}
                        >
                          <SelectTrigger className="min-w-[160px]">
                            <SelectValue placeholder="Selecionar status" />
                          </SelectTrigger>
                          <SelectContent>
                            {ISSUE_STATUS_OPTIONS.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="mt-2">
                          <StatusBadge status={status} />
                        </div>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">{responsible}</td>
                      <td className="p-4 text-sm text-muted-foreground">{dueDate}</td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-2">
                          <Button variant="outline" size="sm" onClick={() => setAssignTarget(issue)}>
                            <UserPlus className="h-4 w-4 mr-1" />
                            Atribuir
                          </Button>

                          <Button variant="ghost" size="sm" onClick={() => openHistory(issue)}>
                            <History className="h-4 w-4 mr-1" />
                            Histórico
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
            Página {page} de {totalPages}
          </p>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
              Anterior
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}

      {/* ------------------ DIALOG ATRIBUIR ------------------ */}
      <Dialog
        open={Boolean(assignTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setAssignTarget(null);
            setAssignValue('');
            setAssignDueDate('');
            setSuggestedAssignee(null);
            setSuggestedAlternatives([]);
            setSuggestedError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atribuir responsável</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">Sugestão automática</h4>
                {suggestedLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              </div>

              {suggestedError ? (
                <div className="text-sm text-destructive">{suggestedError}</div>
              ) : suggestedLoading ? (
                <div className="text-sm text-muted-foreground">Buscando responsável recomendado...</div>
              ) : suggestedAssignee ? (
                <Button
                  className="w-full justify-between text-base"
                  onClick={() => {
                    if (!assignTarget || !suggestedAssignee) return;
                    handleAssign(assignTarget, suggestedAssignee.name, {
                      dueDate: assignDueDate || undefined,
                    });
                    setAssignTarget(null);
                    setAssignValue('');
                  }}
                >
                  <span>Atribuir para {suggestedAssignee.name}</span>
                  {renderResponsibleLabel(suggestedAssignee) && (
                    <span className="text-xs opacity-80">{renderResponsibleLabel(suggestedAssignee)}</span>
                  )}
                </Button>
              ) : (
                <div className="text-sm text-muted-foreground">Nenhuma sugestão encontrada.</div>
              )}

              {!suggestedLoading && suggestedAlternatives.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Alternativas</p>
                  <div className="space-y-2">
                    {suggestedAlternatives.slice(0, 3).map((option, index) => {
                      const pending = option.pendingIssues ?? option.openIssues ?? null;
                      return (
                        <button
                          key={`${option.name}-${index}`}
                          type="button"
                          onClick={() => setAssignValue(option.name)}
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
              <Label>Responsável</Label>
              <Input
                placeholder="Informe o responsável"
                value={assignValue}
                onChange={(event) => setAssignValue(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Prazo</Label>
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
                  Hoje
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
                  +3 dias
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
                  +7 dias
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
              }}
            >
              Cancelar
            </Button>

            <Button
              onClick={() => {
                if (!assignTarget) return;
                const trimmed = assignValue.trim();
                if (!trimmed) {
                  toast({ title: 'Atenção', description: 'Informe o responsável para atribuição.' });
                  return;
                }
                handleAssign(assignTarget, trimmed, {
                  dueDate: assignDueDate || undefined,
                });
                setAssignTarget(null);
                setAssignValue('');
              }}
              disabled={Boolean(assignTarget && actionLoading?.action === 'assign')}
            >
              {actionLoading?.action === 'assign' ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando...
                </span>
              ) : (
                'Atribuir'
              )}
            </Button>

            <Button
              variant="secondary"
              onClick={() => {
                if (!assignTarget) return;
                const trimmed = assignValue.trim();
                if (!trimmed) {
                  toast({ title: 'Atenção', description: 'Informe o responsável para atribuição.' });
                  return;
                }
                handleAssign(assignTarget, trimmed, {
                  dueDate: assignDueDate || undefined,
                  createTicket: true,
                });
                setAssignTarget(null);
                setAssignValue('');
              }}
              disabled={Boolean(assignTarget && actionLoading?.action === 'assign')}
            >
              Atribuir + Criar ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ------------------ DIALOG HISTÓRICO ------------------ */}
      <Dialog
        open={Boolean(historyTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setHistoryTarget(null);
            setHistoryData([]);
            setHistoryError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Histórico da issue</DialogTitle>
          </DialogHeader>

          {historyLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando histórico...
            </div>
          ) : historyError ? (
            <div className="text-sm text-destructive">{historyError}</div>
          ) : historyData.length === 0 ? (
            <div className="text-sm text-muted-foreground">Nenhum histórico encontrado.</div>
          ) : (
            <ul className="space-y-2 text-sm text-muted-foreground">
              {historyData.map((entry, idx) => (
                <li key={`${historyTarget?.id}-history-${idx}`} className="p-2 bg-muted/40 rounded">
                  {entry}
                </li>
              ))}
            </ul>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setHistoryTarget(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
