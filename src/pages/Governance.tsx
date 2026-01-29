import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  Sparkles,
  ShieldAlert,
  Clock,
  UserPlus,
  Eye,
  MoveRight,
  GitMerge,
  CheckCircle2,
  Ban,
  ExternalLink,
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

import { governanceService, GovernanceManualFilters } from '@/services/governance.service';
import { systemsService } from '@/services/systems.service';
import { GovernanceManual, GovernanceSummary, KbSystem, PaginatedResponse } from '@/types';
import { toast } from '@/hooks/use-toast';
import { config } from '@/config/app-config';

const ISSUE_TYPE_LABELS: Record<string, string> = {
  MISSING_CONTENT: 'Conteúdo Ausente',
  BROKEN_LINK: 'Link Quebrado',
  OUTDATED: 'Desatualizado',
  DUPLICATE: 'Duplicado',
  FORMAT_ERROR: 'Erro de Formato',
};

export default function GovernancePage() {
  const [summary, setSummary] = useState<GovernanceSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [manualsData, setManualsData] = useState<PaginatedResponse<GovernanceManual> | null>(null);
  const [manualsLoading, setManualsLoading] = useState(true);
  const [manualsError, setManualsError] = useState<string | null>(null);

  const [systems, setSystems] = useState<KbSystem[]>([]);

  // ✅ paginação 1-based (front)
  const [page, setPage] = useState(1);
  const [size] = useState(config.defaultPageSize);

  // ✅ filtros simples alinhados com backend atual
  const [filters, setFilters] = useState<GovernanceManualFilters>({
    system: '',
    status: '',
    q: '',
  });

  const [assignTarget, setAssignTarget] = useState<GovernanceManual | null>(null);
  const [assignValue, setAssignValue] = useState('');
  const [actionLoading, setActionLoading] = useState<{ id: string; action: string } | null>(null);

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

  const fetchManuals = async (currentFilters = filters, currentPage = page) => {
    setManualsLoading(true);
    setManualsError(null);
    try {
      const result = await governanceService.listManuals({
        page: currentPage,
        size,
        system: currentFilters.system || undefined,
        status: currentFilters.status || undefined,
        q: currentFilters.q || undefined,
      });

      const normalized: PaginatedResponse<GovernanceManual> = {
        data: Array.isArray(result?.data) ? result.data : [],
        total: result?.total ?? 0,
        page: result?.page ?? currentPage,
        size: result?.size ?? size,
        totalPages: result?.totalPages ?? 0,
      };

      setManualsData(normalized);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar manuais';
      console.error('Erro ao carregar manuais de governança:', err);
      setManualsError(message);
      toast({ title: 'Erro', description: message, variant: 'destructive' });
    } finally {
      setManualsLoading(false);
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
    fetchManuals(filters, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ debounce para busca/filtros e paginação
  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchManuals(filters, page);
    }, 250);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, page]);

  const uniqueOptions = (values: Array<string | null | undefined>) =>
    Array.from(new Set(values.filter((value): value is string => Boolean(value && value.trim()))));

  const manuals = manualsData?.data ?? [];

  const systemOptions = useMemo(() => {
    // se vier do endpoint de sistemas, melhor
    if (systems.length > 0) {
      return systems.map((system) => system?.code).filter(Boolean) as string[];
    }
    // fallback: extrai do retorno dos manuais
    return uniqueOptions(manuals.map((manual) => manual?.systemCode || manual?.system));
  }, [manuals, systems]);

  const statusOptions = useMemo(() => uniqueOptions(manuals.map((manual) => manual?.status)), [manuals]);

  const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR');
    } catch {
      return '-';
    }
  };

  const handleAction = async (manualId: string, action: string, handler: () => Promise<void>) => {
    setActionLoading({ id: manualId, action });
    try {
      await handler();
      toast({ title: 'Ação concluída', description: 'Operação realizada com sucesso.' });

      await Promise.all([fetchSummary(), fetchManuals(filters, page)]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao executar ação';
      console.error('Erro ao executar ação de governança:', err);
      toast({ title: 'Erro', description: message, variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleFilterChange = (key: keyof GovernanceManualFilters, value: string) => {
    // sempre resetar pagina ao filtrar
    setPage(1);
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const totalPages = manualsData?.totalPages ?? 0;

  return (
    <MainLayout>
      <PageHeader title="Governança" description="Cockpit operacional da base de conhecimento" />

      {/* ------------------ FILTROS ------------------ */}
      <div className="card-metric mb-6">
        <h3 className="font-semibold mb-4">Filtros avançados</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Sistema</Label>
            <Select
              value={filters.system || 'ALL'}
              onValueChange={(value) => handleFilterChange('system', value === 'ALL' ? '' : value)}
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
                {statusOptions.map((status) => (
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
              placeholder="Buscar manual..."
              value={filters.q || ''}
              onChange={(event) => handleFilterChange('q', event.target.value)}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setPage(1);
              setFilters({ system: '', status: '', q: '' });
            }}
          >
            Limpar filtros
          </Button>

          <Button variant="secondary" onClick={() => fetchManuals(filters, page)}>
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
          <h3 className="font-semibold">Lista de manuais</h3>
          <span className="text-sm text-muted-foreground">
            {manualsData?.total ?? 0} manual{(manualsData?.total ?? 0) !== 1 ? 'is' : ''}
          </span>
        </div>

        {manualsLoading ? (
          <LoadingSkeleton variant="table" rows={5} />
        ) : manualsError ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h3 className="font-semibold text-lg mb-2">Erro ao carregar manuais</h3>
            <p className="text-sm text-muted-foreground mb-4">{manualsError}</p>
            <Button onClick={() => fetchManuals(filters, page)}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar novamente
            </Button>
          </div>
        ) : manuals.length === 0 ? (
          <EmptyState
            icon={AlertTriangle}
            title="Nenhum manual encontrado"
            description="Ajuste os filtros para visualizar os manuais com pendências."
          />
        ) : (
          <div className="table-container overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-semibold text-sm">Manual</th>
                  <th className="text-left p-4 font-semibold text-sm">Sistema</th>
                  <th className="text-left p-4 font-semibold text-sm">Movidesk</th>
                  <th className="text-left p-4 font-semibold text-sm">Problemas</th>
                  <th className="text-left p-4 font-semibold text-sm">Status</th>
                  <th className="text-left p-4 font-semibold text-sm">Risco / Prioridade</th>
                  <th className="text-left p-4 font-semibold text-sm">Responsável</th>
                  <th className="text-left p-4 font-semibold text-sm">Prazo</th>
                  <th className="text-left p-4 font-semibold text-sm">Ações rápidas</th>
                </tr>
              </thead>

              <tbody>
                {manuals.map((manual, index) => {
                  const manualId = manual?.id || `manual-${index}`;
                  const manualTitle = manual?.title || 'Manual sem título';
                  const system = manual?.system || manual?.systemCode || '-';
                  const movideskLink = manual?.movideskLink || '#';
                  const issueTypes = Array.isArray(manual?.issueTypes) ? manual.issueTypes : [];
                  const status = manual?.status || 'PENDING';
                  const risk = manual?.risk || '-';
                  const priority = manual?.priority || '-';
                  const responsible = manual?.responsible || '-';
                  const dueDate = formatDate(manual?.dueDate);

                  const isActionLoading = (action: string) => actionLoading?.id === manualId && actionLoading?.action === action;

                  return (
                    <tr key={manualId} className="border-t border-border hover:bg-muted/30 transition-colors">
                      <td className="p-4 font-medium">{manualTitle}</td>
                      <td className="p-4 text-muted-foreground">{system}</td>

                      <td className="p-4">
                        <Button variant="ghost" size="sm" asChild>
                          <a href={movideskLink} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      </td>

                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {issueTypes.length === 0 ? (
                            <span className="text-xs text-muted-foreground">-</span>
                          ) : (
                            issueTypes.map((issueType) => (
                              <Badge key={`${manualId}-${issueType}`} variant="secondary">
                                {ISSUE_TYPE_LABELS[issueType] || issueType}
                              </Badge>
                            ))
                          )}
                        </div>
                      </td>

                      <td className="p-4">
                        <StatusBadge status={status} />
                      </td>

                      <td className="p-4 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">{risk}</span>
                        <span className="mx-1 text-muted-foreground">/</span>
                        {priority}
                      </td>

                      <td className="p-4 text-sm text-muted-foreground">{responsible}</td>
                      <td className="p-4 text-sm text-muted-foreground">{dueDate}</td>

                      <td className="p-4">
                        <div className="flex flex-wrap gap-2">
                          <Button variant="outline" size="sm" onClick={() => setAssignTarget(manual)}>
                            <UserPlus className="h-4 w-4 mr-1" />
                            Atribuir
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAction(manualId, 'review', () => governanceService.reviewManual(manualId))}
                            disabled={isActionLoading('review')}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Revisar
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAction(manualId, 'move', () => governanceService.moveManual(manualId))}
                            disabled={isActionLoading('move')}
                          >
                            <MoveRight className="h-4 w-4 mr-1" />
                            Mover
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAction(manualId, 'merge', () => governanceService.mergeManual(manualId))}
                            disabled={isActionLoading('merge')}
                          >
                            <GitMerge className="h-4 w-4 mr-1" />
                            Mesclar
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAction(manualId, 'resolve', () => governanceService.resolveManual(manualId))}
                            disabled={isActionLoading('resolve')}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Resolver
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAction(manualId, 'ignore', () => governanceService.ignoreManual(manualId))}
                            disabled={isActionLoading('ignore')}
                          >
                            <Ban className="h-4 w-4 mr-1" />
                            Ignorar
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
      {!manualsLoading && !manualsError && totalPages > 1 && (
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
            <DialogTitle>Atribuir manual</DialogTitle>
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
                handleAction(assignTarget.id, 'assign', () => governanceService.assignManual(assignTarget.id, trimmed));
                setAssignTarget(null);
                setAssignValue('');
              }}
            >
              Atribuir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
