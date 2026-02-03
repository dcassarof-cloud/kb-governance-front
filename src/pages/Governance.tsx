// =====================================================
// GOVERNANCE PAGE (MODO GESTOR) - Consisa KB Governance (Sprint 5)
// =====================================================

import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  Eye,
  UserPlus,
  History,
  RefreshCcw,
  ExternalLink,
} from 'lucide-react';

import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { EmptyState } from '@/components/shared/EmptyState';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import {
  GovernanceOverviewCards,
  SystemsAtRiskTable,
  IssueFilters,
  SlaBadge,
  AssignResponsibleModal,
  ChangeStatusModal,
  ISSUE_TYPE_LABELS,
} from '@/components/governance';

import { governanceService, IssuesFilter } from '@/services/governance.service';
import { systemsService } from '@/services/systems.service';
import {
  GovernanceIssue,
  GovernanceTotalsDto,
  GovernanceSystemHealthDto,
  KbSystem,
  PaginatedResponse,
  IssueType,
} from '@/types';
import { toast } from '@/hooks/use-toast';
import { config } from '@/config/app-config';

const ALLOWED_ISSUE_TYPES: IssueType[] = [
  'REVIEW_REQUIRED',
  'NOT_AI_READY',
  'DUPLICATE_CONTENT',
  'INCOMPLETE_CONTENT',
];

export default function GovernancePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Overview state
  const [totals, setTotals] = useState<GovernanceTotalsDto | null>(null);
  const [systemsAtRisk, setSystemsAtRisk] = useState<GovernanceSystemHealthDto[]>([]);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState<string | null>(null);

  // Issues state
  const [issuesData, setIssuesData] = useState<PaginatedResponse<GovernanceIssue> | null>(null);
  const [issuesLoading, setIssuesLoading] = useState(true);
  const [issuesError, setIssuesError] = useState<string | null>(null);

  // Systems for filters
  const [systems, setSystems] = useState<KbSystem[]>([]);

  // Pagination
  const [page, setPage] = useState(1);
  const [size] = useState(config.defaultPageSize);

  // Filters - default: ordenar por SLA (vencidas primeiro)
  const [filters, setFilters] = useState<IssuesFilter>(() => {
    const systemCodeParam = searchParams.get('systemCode');
    const statusParam = searchParams.get('status');
    const overdueParam = searchParams.get('overdue');
    const unassignedParam = searchParams.get('unassigned');

    return {
      systemCode: systemCodeParam || '',
      status: statusParam as IssuesFilter['status'] || undefined,
      type: undefined,
      severity: undefined,
      responsible: '',
      q: '',
      overdue: overdueParam === 'true' ? true : undefined,
      unassigned: unassignedParam === 'true' ? true : undefined,
      sortBy: 'slaDueAt',
      sortOrder: 'asc',
    };
  });

  // Modals state
  const [assignModalIssue, setAssignModalIssue] = useState<GovernanceIssue | null>(null);
  const [statusModalIssue, setStatusModalIssue] = useState<GovernanceIssue | null>(null);

  // Fetch overview (totals + systems at risk)
  const fetchOverview = useCallback(async () => {
    setOverviewLoading(true);
    setOverviewError(null);
    try {
      const result = await governanceService.getOverview();
      setTotals(result.totals);
      setSystemsAtRisk(result.systemsAtRisk);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar overview';
      console.error('Erro ao carregar overview de governança:', err);
      setOverviewError(message);
      // Fallback: tenta carregar do summary antigo
      try {
        const summary = await governanceService.getSummary();
        setTotals({
          openIssues: summary.openIssues ?? 0,
          criticalIssues: 0,
          unassignedIssues: summary.unassignedIssues ?? 0,
          overdueIssues: 0,
          resolvedLast7Days: summary.resolvedLast7Days ?? null,
        });
        setOverviewError(null);
      } catch {
        // Mantém erro original
      }
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  // Fetch issues
  const fetchIssues = useCallback(async (currentFilters = filters, currentPage = page) => {
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
        overdue: currentFilters.overdue,
        unassigned: currentFilters.unassigned,
        sortBy: currentFilters.sortBy,
        sortOrder: currentFilters.sortOrder,
      });

      setIssuesData({
        data: Array.isArray(result?.data) ? result.data : [],
        total: result?.total ?? 0,
        page: result?.page ?? currentPage,
        size: result?.size ?? size,
        totalPages: result?.totalPages ?? 0,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar issues';
      console.error('Erro ao carregar issues de governança:', err);
      setIssuesError(message);
      toast({ title: 'Erro', description: message, variant: 'destructive' });
    } finally {
      setIssuesLoading(false);
    }
  }, [filters, page, size]);

  // Fetch systems for filters
  const fetchSystems = useCallback(async () => {
    try {
      const result = await systemsService.getSystems();
      setSystems(Array.isArray(result) ? result : []);
    } catch {
      setSystems([]);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchOverview();
    fetchSystems();
    fetchIssues(filters, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce para filtros
  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchIssues(filters, page);
    }, 250);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, page]);

  // Filter issues by allowed types
  const issues = (issuesData?.data ?? []).filter((issue) => ALLOWED_ISSUE_TYPES.includes(issue?.type));
  const totalPages = issuesData?.totalPages ?? 0;

  // Handlers
  const handleFilterChange = (key: keyof IssuesFilter, value: unknown) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setPage(1);
    setFilters({
      systemCode: '',
      status: undefined,
      type: undefined,
      severity: undefined,
      responsible: '',
      q: '',
      overdue: undefined,
      unassigned: undefined,
      sortBy: 'slaDueAt',
      sortOrder: 'asc',
    });
    setSearchParams({});
  };

  const handleRefresh = () => {
    fetchOverview();
    fetchIssues(filters, page);
  };

  const handleCardClick = (filter: string) => {
    setPage(1);
    switch (filter) {
      case 'open':
        setFilters((prev) => ({ ...prev, status: 'OPEN', overdue: undefined, unassigned: undefined }));
        break;
      case 'critical':
        setFilters((prev) => ({ ...prev, severity: 'CRITICAL', overdue: undefined, unassigned: undefined }));
        break;
      case 'unassigned':
        setFilters((prev) => ({ ...prev, unassigned: true, overdue: undefined }));
        break;
      case 'overdue':
        setFilters((prev) => ({ ...prev, overdue: true, unassigned: undefined }));
        break;
    }
  };

  const handleSystemClick = (systemCode: string) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, systemCode }));
  };

  const handleViewDetail = (issue: GovernanceIssue) => {
    navigate(`/governance/issues/${issue.id}`);
  };

  const handleModalSuccess = () => {
    fetchOverview();
    fetchIssues(filters, page);
  };

  return (
    <MainLayout>
      <PageHeader
        title="Governança"
        description="Cockpit gerencial da base de conhecimento - Visão consolidada de issues, SLAs e responsáveis"
      />

      {/* ------------------ OVERVIEW CARDS ------------------ */}
      <GovernanceOverviewCards
        totals={totals}
        isLoading={overviewLoading}
        error={overviewError}
        onRetry={fetchOverview}
        onCardClick={handleCardClick}
      />

      {/* ------------------ SISTEMAS EM RISCO ------------------ */}
      <SystemsAtRiskTable
        systems={systemsAtRisk}
        isLoading={overviewLoading}
        onSystemClick={handleSystemClick}
      />

      {/* ------------------ FILTROS ------------------ */}
      <IssueFilters
        filters={filters}
        systems={systems}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        onRefresh={handleRefresh}
        isLoading={issuesLoading}
      />

      {/* ------------------ LISTA DE ISSUES ------------------ */}
      <div className="card-metric">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Lista de Issues
          </h3>
          <span className="text-sm text-muted-foreground">
            {issues.length} issue{issues.length !== 1 ? 's' : ''}
            {issuesData?.total ? ` de ${issuesData.total}` : ''}
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
            description="Ajuste os filtros ou aguarde a próxima sincronização."
            action={
              <Button variant="outline" onClick={handleClearFilters}>
                Limpar filtros
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-semibold text-sm">Tipo</th>
                  <th className="text-left p-3 font-semibold text-sm">Sistema</th>
                  <th className="text-left p-3 font-semibold text-sm">Severidade</th>
                  <th className="text-left p-3 font-semibold text-sm">Status</th>
                  <th className="text-left p-3 font-semibold text-sm">Responsável</th>
                  <th className="text-left p-3 font-semibold text-sm">SLA</th>
                  <th className="text-left p-3 font-semibold text-sm">Ações</th>
                </tr>
              </thead>
              <tbody>
                {issues.map((issue, index) => {
                  const issueId = issue?.id || `issue-${index}`;
                  const system = issue?.systemName || issue?.systemCode || '-';
                  const typeLabel = ISSUE_TYPE_LABELS[issue?.type] || issue?.typeDisplayName || issue?.type || '-';
                  const responsible = issue?.responsible || 'Sem responsável';
                  const slaDueAt = issue?.slaDueAt || issue?.dueDate;

                  return (
                    <tr
                      key={issueId}
                      className="border-t border-border hover:bg-muted/30 transition-colors"
                    >
                      {/* Tipo */}
                      <td className="p-3">
                        <div>
                          <Badge variant="secondary" className="mb-1">
                            {typeLabel}
                          </Badge>
                          <div className="text-xs text-muted-foreground line-clamp-1">
                            {issue?.articleTitle || issue?.title || '-'}
                          </div>
                        </div>
                      </td>

                      {/* Sistema */}
                      <td className="p-3">
                        <span className="text-sm">{system}</span>
                      </td>

                      {/* Severidade */}
                      <td className="p-3">
                        <StatusBadge status={issue?.severity || 'LOW'} />
                      </td>

                      {/* Status */}
                      <td className="p-3">
                        <StatusBadge status={issue?.status || 'OPEN'} />
                      </td>

                      {/* Responsável */}
                      <td className="p-3">
                        <span className={`text-sm ${!issue?.responsible ? 'text-amber-600 font-medium' : 'text-muted-foreground'}`}>
                          {responsible}
                        </span>
                      </td>

                      {/* SLA Badge */}
                      <td className="p-3">
                        <SlaBadge slaDueAt={slaDueAt} status={issue?.status || 'OPEN'} />
                      </td>

                      {/* Ações */}
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAssignModalIssue(issue)}
                            title="Atribuir responsável"
                          >
                            <UserPlus className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setStatusModalIssue(issue)}
                            title="Mudar status"
                          >
                            <RefreshCcw className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetail(issue)}
                            title="Ver detalhes"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          {issue?.manualLink && (
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                              title="Abrir artigo"
                            >
                              <a href={issue.manualLink} target="_blank" rel="noreferrer">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
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

      {/* ------------------ MODAIS ------------------ */}
      <AssignResponsibleModal
        issue={assignModalIssue}
        open={!!assignModalIssue}
        onOpenChange={(open) => !open && setAssignModalIssue(null)}
        onSuccess={handleModalSuccess}
      />

      <ChangeStatusModal
        issue={statusModalIssue}
        open={!!statusModalIssue}
        onOpenChange={(open) => !open && setStatusModalIssue(null)}
        onSuccess={handleModalSuccess}
      />
    </MainLayout>
  );
}
