import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  Sparkles,
  ShieldAlert,
  Clock,
  UserPlus,
  History,
  Loader2,
} from 'lucide-react';

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
import { GovernanceIssue, GovernanceSummary, IssueStatus, IssueType, KbSystem, PaginatedResponse } from '@/types';
import { toast } from '@/hooks/use-toast';
import { config } from '@/config/app-config';

const ISSUE_TYPE_LABELS: Record<string, string> = {
  MISSING_CONTENT: 'Conteúdo Ausente',
  BROKEN_LINK: 'Link Quebrado',
  OUTDATED: 'Desatualizado',
  DUPLICATE: 'Duplicado',
  FORMAT_ERROR: 'Erro de Formato',
};

const ISSUE_STATUS_OPTIONS: IssueStatus[] = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'IGNORED'];

export default function GovernancePage() {
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
    responsible: '',
  });

  const [assignTarget, setAssignTarget] = useState<GovernanceIssue | null>(null);
  const [assignValue, setAssignValue] = useState('');
  const [actionLoading, setActionLoading] = useState<{ id: string; action: string } | null>(null);

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
        openIssues: result?.openIssues ?? 0,
        criticalManuals: result?.criticalManuals ?? 0,
        slaBreached: result?.slaBreached ?? 0,
        aiReadyPercentage: result?.aiReadyPercentage ?? 0,
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
        status: currentFilters.status,
        type: currentFilters.type,
        responsible: currentFilters.responsible?.trim() || undefined,
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

  // ✅ debounce para busca/filtros e paginação
  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchIssues(filters, page);
    }, 250);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, page]);

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
  const resolvedTypeOptions =
    typeOptions.length > 0 ? typeOptions : (Object.keys(ISSUE_TYPE_LABELS) as IssueType[]);

  const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR');
    } catch {
      return '-';
    }
  };

  const handleAction = async (issueId: string, action: string, handler: () => Promise<void>) => {
    setActionLoading({ id: issueId, action });
    try {
      await handler();
      toast({ title: 'Ação concluída', description: 'Operação realizada com sucesso.' });
      await fetchSummary();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao executar ação';
      console.error('Erro ao executar ação de governança:', err);
      toast({ title: 'Erro', description: message, variant: 'destructive' });
    } finally {
      setActionLoading(null);
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

  const handleAssign = async (issueId: string, responsible: string) => {
    await handleAction(issueId, 'assign', async () => {
      const updated = await governanceService.assignIssue(issueId, responsible);
      updateIssueState(issueId, {
        responsible: updated?.responsible ?? responsible,
      });
    });
  };

  const handleStatusChange = async (issueId: string, status: IssueStatus) => {
    await handleAction(issueId, 'status', async () => {
      const updated = await governanceService.changeStatus(issueId, status);
      const nextStatus = updated?.status ?? status;
      setIssuesData((prev) => {
        if (!prev) return prev;
        const nextData = prev.data.map((issue) =>
          issue.id === issueId ? { ...issue, status: nextStatus } : issue
        );
        if (filters.status && filters.status !== nextStatus) {
          return {
            ...prev,
            data: nextData.filter((issue) => issue.id !== issueId),
            total: Math.max(prev.total - 1, 0),
          };
        }
        return { ...prev, data: nextData };
      });
    });
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

  const totalPages = issuesData?.totalPages ?? 0;

  return (
    <MainLayout>
      <PageHeader title="Governança" description="Cockpit operacional da base de conhecimento" />

      {/* ------------------ FILTROS ------------------ */}
      <div className="card-metric mb-6">
        <h3 className="font-semibold mb-4">Filtros avançados</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
            <Label>Responsável</Label>
            <Input
              placeholder="Nome do responsável"
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
              setFilters({ systemCode: '', status: undefined, type: undefined, responsible: '' });
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <MetricCard title="Issues abertas" value={summary?.openIssues ?? 0} icon={AlertTriangle} variant="warning" />
          <MetricCard
            title="Manuais críticos"
            value={summary?.criticalManuals ?? 0}
            icon={ShieldAlert}
            variant="error"
          />
          <MetricCard title="SLA vencido" value={summary?.slaBreached ?? 0} icon={Clock} variant="warning" />
          <MetricCard
            title="% IA-ready"
            value={`${summary?.aiReadyPercentage ?? 0}%`}
            icon={Sparkles}
            variant="success"
          />
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
                  <th className="text-left p-4 font-semibold text-sm">Sistema</th>
                  <th className="text-left p-4 font-semibold text-sm">Manual</th>
                  <th className="text-left p-4 font-semibold text-sm">Status</th>
                  <th className="text-left p-4 font-semibold text-sm">Responsável</th>
                  <th className="text-left p-4 font-semibold text-sm">Prazo</th>
                  <th className="text-left p-4 font-semibold text-sm">Ações</th>
                </tr>
              </thead>

              <tbody>
                {issues.map((issue, index) => {
                  const issueId = issue?.id || `issue-${index}`;
                  const system = issue?.systemName || issue?.systemCode || '-';
                  const manualTitle = issue?.articleTitle || 'Manual sem título';
                  const status = issue?.status || 'OPEN';
                  const responsible = issue?.responsible || '-';
                  const dueDate = formatDate(issue?.dueDate);

                  const isActionLoading = (action: string) => actionLoading?.id === issueId && actionLoading?.action === action;

                  return (
                    <tr key={issueId} className="border-t border-border hover:bg-muted/30 transition-colors">
                      <td className="p-4">
                        <Badge variant="secondary">{ISSUE_TYPE_LABELS[issue?.type] || issue?.type || '-'}</Badge>
                      </td>
                      <td className="p-4 text-muted-foreground">{system}</td>
                      <td className="p-4 font-medium">{manualTitle}</td>
                      <td className="p-4">
                        <Select
                          value={status}
                          onValueChange={(value) => handleStatusChange(issueId, value as IssueStatus)}
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
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atribuir responsável</DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            <Label>Responsável</Label>
            <Input
              placeholder="Informe o responsável"
              value={assignValue}
              onChange={(event) => setAssignValue(event.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAssignTarget(null);
                setAssignValue('');
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
                handleAssign(assignTarget.id, trimmed);
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
