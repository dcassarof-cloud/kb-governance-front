import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertCircle, ClipboardList, Info, Loader2, RefreshCw } from 'lucide-react';

import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { ApiErrorBanner } from '@/components/shared/ApiErrorBanner';
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
import { ApiError, KbSystem, NeedDetail, NeedItem, PaginatedResponse } from '@/types';
import { formatApiErrorInfo, toApiErrorInfo } from '@/lib/api-error-info';
import { governanceTexts } from '@/governanceTexts';

export default function NeedsPage() {
  const { id } = useParams();

  const [needsData, setNeedsData] = useState<PaginatedResponse<NeedItem> | null>(null);
  const [needsLoading, setNeedsLoading] = useState(true);
  const [needsError, setNeedsError] = useState<string | null>(null);
  const [partialFailure, setPartialFailure] = useState(false);

  const [systems, setSystems] = useState<KbSystem[]>([]);
  const [filters, setFilters] = useState<NeedsFilter>({
    systemCode: '',
    status: '',
    start: '',
    end: '',
  });
  const [sortOption, setSortOption] = useState<'impact' | 'recurrence' | ''>('');

  const [page, setPage] = useState(1);
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
      const sortMap: Record<string, string | undefined> = {
        impact: 'severity,desc',
        recurrence: 'occurrences,desc',
      };
      const now = new Date();
      const endDefault = now.toISOString().slice(0, 10);
      const startDefault = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

      const result = await needsService.listNeedsWithMeta({
        systemCode: currentFilters.systemCode || undefined,
        status: currentFilters.status || undefined,
        periodStart: currentFilters.start || startDefault,
        periodEnd: currentFilters.end || endDefault,
        sort: sortMap[sortOption],
        page: currentPage,
        size: 50,
      });

      setNeedsData(result.payload);
      setPartialFailure(result.meta.partialFailure);

    } catch (err) {
      const info = toApiErrorInfo(err, governanceTexts.needs.errors.loadNeeds);
      const message = formatApiErrorInfo(info);

      setNeedsData((prev) =>
        prev ?? {
          data: [],
          total: 0,
          page: currentPage,
          size: 50,
          totalPages: 0,
        }
      );
      setNeedsError(message);
      setPartialFailure(false);
      toast({ title: governanceTexts.general.errorTitle, description: message, variant: 'destructive' });
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
      const message = err instanceof Error ? err.message : governanceTexts.needs.detail.error;
      setDetailError(message);
      toast({ title: governanceTexts.general.errorTitle, description: message, variant: 'destructive' });
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
        toast({ title: governanceTexts.needs.detail.taskSuccess, description: governanceTexts.needs.detail.taskDescription });
      } else {
        await needsService.createMasterTicket(detailId);
        toast({ title: governanceTexts.needs.detail.ticketSuccess, description: governanceTexts.needs.detail.ticketDescription });
      }
      await fetchNeeds(filters, page);
    } catch (err) {
      const message = err instanceof Error ? err.message : governanceTexts.needs.errors.actionError;
      toast({ title: governanceTexts.general.errorTitle, description: message, variant: 'destructive' });
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
    if (!dateStr) return governanceTexts.general.notAvailable;
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR');
    } catch {
      return governanceTexts.general.notAvailable;
    }
  };

  const formatWindow = (need: NeedItem) => {
    const start = formatDate(need.windowStart);
    const end = formatDate(need.windowEnd);
    if (start === governanceTexts.general.notAvailable && end === governanceTexts.general.notAvailable) {
      return governanceTexts.needs.list.noWindow;
    }
    return `${start} → ${end}`;
  };

  const severityOrder: Record<string, number> = {
    CRITICAL: 0,
    HIGH: 1,
    MEDIUM: 2,
    LOW: 3,
  };

  const resolveOccurrences = (need: NeedItem) =>
    typeof need.occurrences === 'number'
      ? need.occurrences
      : typeof need.quantity === 'number'
        ? need.quantity
        : null;

  const locallyFilteredNeeds = useMemo(() => {
    return needs.filter((need) => {
      const matchesSystem = !filters.systemCode || (need.systemCode ?? '').toUpperCase() === filters.systemCode.toUpperCase();
      const matchesStatus = !filters.status || (need.status ?? '').toUpperCase() === filters.status.toUpperCase();

      const createdAt = need.createdAt ? new Date(need.createdAt) : null;
      const matchesStart = !filters.start || (createdAt !== null && !Number.isNaN(createdAt.getTime()) && createdAt >= new Date(filters.start));
      const matchesEnd = !filters.end || (createdAt !== null && !Number.isNaN(createdAt.getTime()) && createdAt <= new Date(`${filters.end}T23:59:59`));

      return matchesSystem && matchesStatus && matchesStart && matchesEnd;
    });
  }, [filters.end, filters.start, filters.status, filters.systemCode, needs]);

  const sortedNeeds = useMemo(() => {
    const items = [...locallyFilteredNeeds];
    if (!sortOption) return items;
    if (sortOption === 'impact') {
      return items.sort((a, b) => {
        const aKey = a.severity ? severityOrder[a.severity] ?? 99 : 99;
        const bKey = b.severity ? severityOrder[b.severity] ?? 99 : 99;
        return aKey - bKey;
      });
    }
    return items.sort((a, b) => {
      const aCount = resolveOccurrences(a) ?? 0;
      const bCount = resolveOccurrences(b) ?? 0;
      return bCount - aCount;
    });
  }, [locallyFilteredNeeds, sortOption]);

  return (
    <MainLayout>
      <PageHeader title={governanceTexts.needs.title} description={governanceTexts.needs.description} />

      <div className="card-metric mb-6">
        <h3 className="font-semibold mb-4">{governanceTexts.needs.filtersTitle}</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="space-y-2">
            <Label>{governanceTexts.needs.filters.system}</Label>
            <Select
              value={filters.systemCode || 'ALL'}
              onValueChange={(value) => handleFilterChange('systemCode', value === 'ALL' ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={governanceTexts.needs.filters.systemPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{governanceTexts.needs.filters.systemPlaceholder}</SelectItem>
                {systemOptions.map((system) => (
                  <SelectItem key={system} value={system}>
                    {system}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{governanceTexts.needs.filters.status}</Label>
            <Select
              value={filters.status || 'ALL'}
              onValueChange={(value) => handleFilterChange('status', value === 'ALL' ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={governanceTexts.needs.filters.statusPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{governanceTexts.needs.filters.statusPlaceholder}</SelectItem>
                {statusOptions.map((status) => (
                  <SelectItem key={status} value={status}>
                    {governanceTexts.status.labels[status] || status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{governanceTexts.needs.filters.startDate}</Label>
            <Input
              type="date"
              value={filters.start || ''}
              onChange={(event) => handleFilterChange('start', event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>{governanceTexts.needs.filters.endDate}</Label>
            <Input
              type="date"
              value={filters.end || ''}
              onChange={(event) => handleFilterChange('end', event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>{governanceTexts.needs.filters.sort}</Label>
            <Select
              value={sortOption || 'ALL'}
              onValueChange={(value) => setSortOption(value === 'ALL' ? '' : (value as 'impact' | 'recurrence'))}
            >
              <SelectTrigger>
                <SelectValue placeholder={governanceTexts.needs.filters.sortPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{governanceTexts.needs.filters.sortPlaceholder}</SelectItem>
                <SelectItem value="impact">{governanceTexts.needs.filters.sortOptions.impact}</SelectItem>
                <SelectItem value="recurrence">{governanceTexts.needs.filters.sortOptions.recurrence}</SelectItem>
              </SelectContent>
            </Select>
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
                start: '',
                end: '',
              });
              setSortOption('');
            }}
          >
            {governanceTexts.general.clearFilters}
          </Button>

          <Button variant="secondary" onClick={() => fetchNeeds(filters, page)}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {governanceTexts.general.refreshList}
          </Button>
        </div>
      </div>


      {partialFailure && !needsError && (
        <div className="mb-4 rounded-md border border-warning/40 bg-warning/10 px-4 py-2 text-sm text-warning-foreground flex items-center gap-2">
          <Info className="h-4 w-4" />
          <span>Movidesk indisponível no momento, exibindo dados parciais.</span>
        </div>
      )}

      <div className="card-metric">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">{governanceTexts.needs.list.title}</h3>
          <span className="text-sm text-muted-foreground">
            {governanceTexts.governance.list.count(sortedNeeds.length)}
          </span>
        </div>

        {needsError && sortedNeeds.length > 0 && (
          <ApiErrorBanner
            title="Falha ao carregar necessidades"
            description={needsError}
            onRetry={() => fetchNeeds(filters, page)}
          />
        )}

        {needsLoading ? (
          <LoadingSkeleton variant="table" rows={5} />
        ) : needsError && sortedNeeds.length === 0 ? (
          <>
            <ApiErrorBanner
              title="Falha ao carregar necessidades"
              description={needsError}
              onRetry={() => fetchNeeds(filters, page)}
            />
            <EmptyState
              icon={AlertCircle}
              title={governanceTexts.needs.errors.loadNeeds}
              description="Não foi possível carregar os dados. Verifique o status/correlationId no alerta acima e tente recarregar."
              action={{ label: 'Recarregar', onClick: () => fetchNeeds(filters, page) }}
            />
          </>
        ) : sortedNeeds.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title={governanceTexts.needs.list.emptyTitle}
            description={governanceTexts.needs.list.emptyDescription}
          />
        ) : (
          <div className="table-container overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-semibold text-sm">Protocolo/ID</th>
                  <th className="text-left p-4 font-semibold text-sm">Assunto</th>
                  <th className="text-left p-4 font-semibold text-sm">Resumo</th>
                  <th className="text-left p-4 font-semibold text-sm">{governanceTexts.needs.filters.system}</th>
                  <th className="text-left p-4 font-semibold text-sm">{governanceTexts.needs.filters.status}</th>
                  <th className="text-left p-4 font-semibold text-sm">Data criação</th>
                  <th className="text-left p-4 font-semibold text-sm">{governanceTexts.needs.list.actionsLabel}</th>
                </tr>
              </thead>
              <tbody>
                {sortedNeeds.map((need, index) => {
                  const needId = need?.id || `need-${index}`;
                  const protocol = need.protocol || need.id || governanceTexts.general.notAvailable;
                  const subject = need.subject || governanceTexts.general.notAvailable;
                  const summary = need.summary || need.subject || governanceTexts.general.notAvailable;
                  const detectedSystem = filters.systemCode || need.systemCode || need.systemName || governanceTexts.general.notAvailable;

                  return (
                    <tr key={needId} className="border-t border-border hover:bg-muted/30 transition-colors">
                      <td className="p-4 text-sm font-medium">{protocol}</td>
                      <td className="p-4 text-sm text-muted-foreground">{subject}</td>
                      <td className="p-4 text-sm text-muted-foreground">
                        <div className="line-clamp-2">{summary}</div>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">{detectedSystem}</td>
                      <td className="p-4">
                        <StatusBadge status={need.status || 'OPEN'} />
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">{formatDate(need.createdAt)}</td>
                      <td className="p-4">
                        <div className="flex flex-col items-start gap-2">
                          <Button variant="outline" size="sm" onClick={() => openDetail(needId)}>
                            {governanceTexts.governance.list.actionDetail}
                          </Button>
                          {need.link && (
                            <a
                              href={need.link}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-primary hover:underline"
                            >
                              Link Movidesk
                            </a>
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

      {!needsLoading && !needsError && totalPages > 1 && (
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
            <DialogTitle>{governanceTexts.needs.detail.title}</DialogTitle>
          </DialogHeader>

          {detailLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {governanceTexts.needs.detail.loading}
            </div>
          ) : detailError ? (
            <div className="text-sm text-destructive">{detailError}</div>
          ) : detailData ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="text-muted-foreground">{governanceTexts.needs.filters.system}</p>
                  <p className="font-medium">{detailData.systemName || detailData.systemCode || governanceTexts.general.notAvailable}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">{governanceTexts.needs.filters.status}</p>
                  <StatusBadge status={detailData.status || 'OPEN'} />
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">{governanceTexts.needs.filters.severity}</p>
                  <StatusBadge status={detailData.severity || 'LOW'} />
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">{governanceTexts.needs.list.windowLabel}</p>
                  <p className="font-medium">{formatWindow(detailData)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">{governanceTexts.needs.list.quantityLabel}</p>
                  <p className="font-medium">{detailData.quantity ?? governanceTexts.general.notAvailable}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">{governanceTexts.needs.detail.createdAtLabel}</p>
                  <p className="font-medium">{formatDate(detailData.createdAt)}</p>
                </div>
              </div>

              <div className="rounded-md border border-border bg-muted/30 p-4 text-sm">
                <p className="text-muted-foreground mb-1">{governanceTexts.needs.detail.reasonTitle}</p>
                <p className="font-medium">
                  {detailData.description || detailData.reason || governanceTexts.needs.detail.noReason}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold">{governanceTexts.needs.detail.examplesTitle}</p>
                {detailData.examples && detailData.examples.length > 0 ? (
                  <div className="space-y-2">
                    {detailData.examples.map((example, idx) => (
                      <div
                        key={`${example.id || idx}`}
                        className="rounded-md border border-border bg-muted/40 p-3 text-sm"
                      >
                        <p className="font-medium">{example.title || governanceTexts.needs.detail.noExampleTitle}</p>
                        <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span>{governanceTexts.needs.filters.system}: {example.systemCode || governanceTexts.general.notAvailable}</span>
                          <span>{governanceTexts.needs.detail.openedAtLabel}: {formatDate(example.createdAt)}</span>
                          {example.url ? (
                            <a href={example.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                              {governanceTexts.needs.detail.viewTicket}
                            </a>
                          ) : (
                            <span>{governanceTexts.general.notAvailable}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">{governanceTexts.needs.detail.noExamples}</div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">{governanceTexts.needs.detail.selectPrompt}</div>
          )}

          <DialogFooter className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setDetailId(null)}>
              {governanceTexts.general.close}
            </Button>
            <Button
              variant="secondary"
              onClick={() => setPendingAction('task')}
              disabled={detailLoading || !detailData}
            >
              {governanceTexts.needs.actions.createTask}
            </Button>
            <Button
              onClick={() => setPendingAction('ticket')}
              disabled={detailLoading || !detailData}
            >
              {governanceTexts.needs.actions.createTicket}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(pendingAction)} onOpenChange={(open) => !open && setPendingAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{governanceTexts.needs.actions.confirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction === 'task'
                ? governanceTexts.needs.actions.confirmTask
                : governanceTexts.needs.actions.confirmTicket}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{governanceTexts.general.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pendingAction && handleAction(pendingAction)}
              disabled={Boolean(pendingAction && actionLoading === pendingAction)}
            >
              {actionLoading ? governanceTexts.needs.actions.processing : governanceTexts.needs.actions.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
