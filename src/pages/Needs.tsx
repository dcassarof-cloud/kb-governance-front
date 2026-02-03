import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertCircle, ClipboardList, Loader2, RefreshCw } from 'lucide-react';

import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatusBadge } from '@/components/shared/StatusBadge';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { needsService, NeedsFilter } from '@/services/needs.service';
import { systemsService } from '@/services/systems.service';
import { toast } from '@/hooks/use-toast';
import { config } from '@/config/app-config';
import { IssueSeverity, KbSystem, NeedDetail, NeedItem, PaginatedResponse } from '@/types';

const SEVERITY_OPTIONS: IssueSeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export default function NeedsPage() {
  const { id } = useParams();

  const [needsData, setNeedsData] = useState<PaginatedResponse<NeedItem> | null>(null);
  const [needsLoading, setNeedsLoading] = useState(true);
  const [needsError, setNeedsError] = useState<string | null>(null);

  const [systems, setSystems] = useState<KbSystem[]>([]);
  const [filters, setFilters] = useState<NeedsFilter>({
    systemCode: '',
    status: '',
    severity: undefined,
    windowStart: '',
    windowEnd: '',
  });

  const [page, setPage] = useState(1);
  const [size] = useState(config.defaultPageSize);

  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<NeedDetail | null>(null);

  const [pendingAction, setPendingAction] = useState<'task' | 'ticket' | null>(null);
  const [actionLoading, setActionLoading] = useState<'task' | 'ticket' | null>(null);

  const fetchSystems = async () => {
    try {
      const result = await systemsService.getSystems();
      setSystems(Array.isArray(result) ? result : []);
    } catch {
      setSystems([]);
    }
  };

  const fetchNeeds = async (currentFilters = filters, currentPage = page) => {
    setNeedsLoading(true);
    setNeedsError(null);
    try {
      const result = await needsService.listNeeds({
        page: currentPage,
        size,
        systemCode: currentFilters.systemCode || undefined,
        status: currentFilters.status || undefined,
        severity: currentFilters.severity || undefined,
        windowStart: currentFilters.windowStart || undefined,
        windowEnd: currentFilters.windowEnd || undefined,
      });

      setNeedsData(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar needs';
      setNeedsError(message);
      toast({ title: 'Erro', description: message, variant: 'destructive' });
    } finally {
      setNeedsLoading(false);
    }
  };

  const openDetail = async (needId: string) => {
    setDetailId(needId);
    setDetailLoading(true);
    setDetailError(null);
    setDetailData(null);
    try {
      const detail = await needsService.getNeed(needId);
      setDetailData(detail);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar detalhe';
      setDetailError(message);
      toast({ title: 'Erro', description: message, variant: 'destructive' });
    } finally {
      setDetailLoading(false);
    }
  };

  const handleAction = async (action: 'task' | 'ticket') => {
    if (!detailId) return;
    setActionLoading(action);
    try {
      if (action === 'task') {
        await needsService.createInternalTask(detailId);
        toast({ title: 'Tarefa criada', description: 'A tarefa interna foi registrada com sucesso.' });
      } else {
        await needsService.createMasterTicket(detailId);
        toast({ title: 'Ticket mestre criado', description: 'O ticket mestre foi registrado com sucesso.' });
      }
      await fetchNeeds(filters, page);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao executar ação';
      toast({ title: 'Erro', description: message, variant: 'destructive' });
    } finally {
      setActionLoading(null);
      setPendingAction(null);
    }
  };

  useEffect(() => {
    fetchSystems();
    fetchNeeds(filters, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchNeeds(filters, page);
    }, 250);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, page]);

  useEffect(() => {
    if (id) {
      openDetail(id);
    }
  }, [id]);

  const handleFilterChange = (key: keyof NeedsFilter, value: string) => {
    setPage(1);
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const uniqueOptions = (values: Array<string | null | undefined>) =>
    Array.from(new Set(values.filter((value): value is string => Boolean(value && value.trim()))));

  const needs = needsData?.data ?? [];

  const systemOptions = useMemo(() => {
    if (systems.length > 0) {
      return systems.map((system) => system?.code).filter(Boolean) as string[];
    }
    return uniqueOptions(needs.map((need) => need?.systemCode));
  }, [needs, systems]);

  const statusOptions = useMemo(() => uniqueOptions(needs.map((need) => need?.status)), [needs]);

  const totalPages = needsData?.totalPages ?? 0;

  const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR');
    } catch {
      return '-';
    }
  };

  const formatWindow = (need: NeedItem) => {
    const start = formatDate(need.windowStart);
    const end = formatDate(need.windowEnd);
    if (start === '-' && end === '-') return 'Sem janela definida';
    return `${start} → ${end}`;
  };

  return (
    <MainLayout>
      <PageHeader title="Needs" description="Demandas operacionais abertas para a base de conhecimento" />

      <div className="card-metric mb-6">
        <h3 className="font-semibold mb-4">Filtros disponíveis</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                {statusOptions.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
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
                {SEVERITY_OPTIONS.map((severity) => (
                  <SelectItem key={severity} value={severity}>
                    {severity}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Janela (início)</Label>
            <Input
              type="date"
              value={filters.windowStart || ''}
              onChange={(event) => handleFilterChange('windowStart', event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Janela (fim)</Label>
            <Input
              type="date"
              value={filters.windowEnd || ''}
              onChange={(event) => handleFilterChange('windowEnd', event.target.value)}
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
                status: '',
                severity: undefined,
                windowStart: '',
                windowEnd: '',
              });
            }}
          >
            Limpar filtros
          </Button>

          <Button variant="secondary" onClick={() => fetchNeeds(filters, page)}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar lista
          </Button>
        </div>
      </div>

      <div className="card-metric">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Needs em aberto</h3>
          <span className="text-sm text-muted-foreground">
            {needs.length} need{needs.length !== 1 ? 's' : ''}
          </span>
        </div>

        {needsLoading ? (
          <LoadingSkeleton variant="table" rows={5} />
        ) : needsError ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h3 className="font-semibold text-lg mb-2">Erro ao carregar needs</h3>
            <p className="text-sm text-muted-foreground mb-4">{needsError}</p>
            <Button onClick={() => fetchNeeds(filters, page)}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar novamente
            </Button>
          </div>
        ) : needs.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="Nenhum need aberto"
            description="Não há necessidades registradas para o período selecionado."
          />
        ) : (
          <div className="table-container overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-semibold text-sm">Sistema</th>
                  <th className="text-left p-4 font-semibold text-sm">Status</th>
                  <th className="text-left p-4 font-semibold text-sm">Severidade</th>
                  <th className="text-left p-4 font-semibold text-sm">Janela</th>
                  <th className="text-left p-4 font-semibold text-sm">Quantidade</th>
                  <th className="text-left p-4 font-semibold text-sm">Motivo</th>
                  <th className="text-left p-4 font-semibold text-sm">Ações</th>
                </tr>
              </thead>
              <tbody>
                {needs.map((need, index) => {
                  const needId = need?.id || `need-${index}`;
                  return (
                    <tr key={needId} className="border-t border-border hover:bg-muted/30 transition-colors">
                      <td className="p-4 text-sm text-muted-foreground">
                        {need.systemName || need.systemCode || '-'}
                      </td>
                      <td className="p-4">
                        <StatusBadge status={need.status || 'OPEN'} />
                      </td>
                      <td className="p-4">
                        <StatusBadge status={need.severity || 'LOW'} />
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">{formatWindow(need)}</td>
                      <td className="p-4 text-sm text-muted-foreground">{need.quantity ?? '-'}</td>
                      <td className="p-4">
                        <div className="line-clamp-2 text-sm text-muted-foreground">
                          {need.reason || 'Motivo não informado'}
                        </div>
                      </td>
                      <td className="p-4">
                        <Button variant="outline" size="sm" onClick={() => openDetail(needId)}>
                          Ver detalhe
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!needsLoading && !needsError && totalPages > 1 && (
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

      <Dialog
        open={Boolean(detailId)}
        onOpenChange={(open) => {
          if (!open) {
            setDetailId(null);
            setDetailData(null);
            setDetailError(null);
            setPendingAction(null);
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detalhe do need</DialogTitle>
          </DialogHeader>

          {detailLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando informações...
            </div>
          ) : detailError ? (
            <div className="text-sm text-destructive">{detailError}</div>
          ) : detailData ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="text-muted-foreground">Sistema</p>
                  <p className="font-medium">{detailData.systemName || detailData.systemCode || '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Status</p>
                  <StatusBadge status={detailData.status || 'OPEN'} />
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Severidade</p>
                  <StatusBadge status={detailData.severity || 'LOW'} />
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Janela</p>
                  <p className="font-medium">{formatWindow(detailData)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Quantidade</p>
                  <p className="font-medium">{detailData.quantity ?? '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Gerado em</p>
                  <p className="font-medium">{formatDate(detailData.createdAt)}</p>
                </div>
              </div>

              <div className="rounded-md border border-border bg-muted/30 p-4 text-sm">
                <p className="text-muted-foreground mb-1">Por que foi gerado</p>
                <p className="font-medium">
                  {detailData.description || detailData.reason || 'Motivo não informado pelo backend.'}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold">Exemplos de tickets</p>
                {detailData.examples && detailData.examples.length > 0 ? (
                  <div className="space-y-2">
                    {detailData.examples.map((example, idx) => (
                      <div
                        key={`${example.id || idx}`}
                        className="rounded-md border border-border bg-muted/40 p-3 text-sm"
                      >
                        <p className="font-medium">{example.title || 'Ticket sem título'}</p>
                        <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span>Sistema: {example.systemCode || 'N/A'}</span>
                          <span>Aberto em: {formatDate(example.createdAt)}</span>
                          {example.url ? (
                            <a href={example.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                              Abrir ticket
                            </a>
                          ) : (
                            <span>Link indisponível</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">Nenhum exemplo retornado pelo backend.</div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Selecione um need para ver detalhes.</div>
          )}

          <DialogFooter className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setDetailId(null)}>
              Fechar
            </Button>
            <Button
              variant="secondary"
              onClick={() => setPendingAction('task')}
              disabled={detailLoading || !detailData}
            >
              Criar tarefa interna
            </Button>
            <Button
              onClick={() => setPendingAction('ticket')}
              disabled={detailLoading || !detailData}
            >
              Criar ticket mestre
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(pendingAction)} onOpenChange={(open) => !open && setPendingAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar ação</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction === 'task'
                ? 'Deseja criar uma tarefa interna para este need?'
                : 'Deseja criar um ticket mestre para este need?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pendingAction && handleAction(pendingAction)}
              disabled={Boolean(pendingAction && actionLoading === pendingAction)}
            >
              {actionLoading ? 'Processando...' : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
