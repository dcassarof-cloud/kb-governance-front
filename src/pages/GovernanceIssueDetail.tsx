import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CalendarClock, Loader2, UserPlus, ClipboardCheck, RefreshCw, AlertOctagon, Clock, CheckCircle2 } from 'lucide-react';

import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { governanceService } from '@/services/governance.service';
import { authService, hasRole } from '@/services/auth.service';
import { duplicatesService } from '@/services/duplicates.service';
import {
  GovernanceIssueDetail,
  GovernanceIssueHistoryDto,
  DuplicateGroup,
  IssueSeverity,
  IssueStatus,
  GovernanceResponsible,
} from '@/types';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { governanceTexts } from '@/governanceTexts';
import { CreateManualAssignmentDialog } from '@/features/governance/components/CreateManualAssignmentDialog';

const ISSUE_TYPE_LABELS: Record<string, string> = governanceTexts.issueTypes;
const ISSUE_STATUS_OPTIONS: IssueStatus[] = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'IGNORED'];

/**
 * Transforma campos técnicos do histórico em frases humanas legíveis
 */
const humanizeHistoryField = (field: string | null | undefined): string => {
  if (!field) return 'Atualização geral';

  const fieldMappings: Record<string, string> = {
    'status': 'Situação',
    'responsible': 'Responsável',
    'responsible_id': 'Responsável',
    'responsible_type': 'Tipo de responsável',
    'responsibleId': 'Responsável',
    'responsibleType': 'Tipo de responsável',
    'responsibleName': 'Nome do responsável',
    'due_date': 'Prazo',
    'dueDate': 'Prazo',
    'sla_due_at': 'Prazo SLA',
    'slaDueAt': 'Prazo SLA',
    'sla_days': 'Dias SLA',
    'slaDays': 'Dias SLA',
    'severity': 'Impacto',
    'priority': 'Prioridade',
    'type': 'Tipo',
    'description': 'Descrição',
    'recommendation': 'Recomendação',
    'article_id': 'Manual',
    'articleId': 'Manual',
    'system_code': 'Sistema',
    'systemCode': 'Sistema',
    'ignored_reason': 'Motivo do descarte',
    'ignoredReason': 'Motivo do descarte',
    'note': 'Observação',
    'created_at': 'Data de criação',
    'createdAt': 'Data de criação',
    'updated_at': 'Data de atualização',
    'updatedAt': 'Data de atualização',
  };

  const normalizedField = field.replace(/_/g, '').toLowerCase();
  for (const [key, label] of Object.entries(fieldMappings)) {
    if (key.replace(/_/g, '').toLowerCase() === normalizedField) {
      return label;
    }
  }

  // Fallback: capitaliza o campo
  return field.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

const parseHistoryJsonValue = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return null;
  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed === 'string') return parsed;
    if (Array.isArray(parsed)) return parsed.join(', ');
    if (parsed && typeof parsed === 'object') {
      const obj = parsed as Record<string, unknown>;
      return (
        (obj.name as string) ??
        (obj.title as string) ??
        (obj.label as string) ??
        (obj.value as string) ??
        JSON.stringify(obj)
      );
    }
  } catch {
    return null;
  }
  return null;
};

/**
 * Transforma valores técnicos em valores legíveis
 */
const humanizeHistoryValue = (value: string | null | undefined, field?: string | null): string => {
  if (value === null || value === undefined || value === '') return '(vazio)';

  const parsed = parseHistoryJsonValue(value);
  if (parsed) return parsed;

  // Status
  if (governanceTexts.status.labels[value as IssueStatus]) {
    return governanceTexts.status.labels[value as IssueStatus];
  }

  // Severity
  if (governanceTexts.severity.labels[value as IssueSeverity]) {
    return governanceTexts.severity.labels[value as IssueSeverity];
  }

  // Issue types
  if (governanceTexts.issueTypes[value as keyof typeof governanceTexts.issueTypes]) {
    return governanceTexts.issueTypes[value as keyof typeof governanceTexts.issueTypes];
  }

  // Responsible types
  if (['AGENT', 'USER', 'TEAM', 'ROLE'].includes(value)) {
    const types: Record<string, string> = governanceTexts.governance.assignDialog.responsibleTypeOptions;
    return types[value] || value;
  }

  // Dates - try to format
  if (field?.toLowerCase().includes('date') || field?.toLowerCase().includes('at')) {
    try {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) {
        return date.toLocaleDateString('pt-BR');
      }
    } catch {
      // não é data, retorna valor original
    }
  }

  return value;
};

/**
 * Gera uma frase humana completa para uma entrada do histórico
 */
const generateHumanPhrase = (entry: GovernanceIssueHistoryDto): string => {
  const field = entry.field;
  const oldValue = entry.oldValue;
  const newValue = entry.newValue;
  const status = entry.status;

  // Se é uma mudança de status direto
  if (status && !field) {
    const statusLabel = governanceTexts.status.labels[status as IssueStatus] || status;
    return `Situação alterada para: ${statusLabel}`;
  }

  // Se é uma mudança de campo
  if (field) {
    const fieldLabel = humanizeHistoryField(field);
    const oldLabel = humanizeHistoryValue(oldValue, field);
    const newLabel = humanizeHistoryValue(newValue, field);

    // Responsável
    if (field.toLowerCase().includes('responsible') && !field.toLowerCase().includes('type')) {
      if (!oldValue || oldValue === '') {
        return `Responsável atribuído: ${newLabel}`;
      }
      return `Responsável alterado: ${oldLabel} → ${newLabel}`;
    }

    // Status
    if (field.toLowerCase() === 'status') {
      return `Situação alterada: ${oldLabel} → ${newLabel}`;
    }

    // Due date / SLA
    if (field.toLowerCase().includes('due') || field.toLowerCase().includes('sla')) {
      if (!oldValue || oldValue === '') {
        return `${fieldLabel} definido: ${newLabel}`;
      }
      return `${fieldLabel} alterado: ${oldLabel} → ${newLabel}`;
    }

    // Genérico
    if (!oldValue || oldValue === '') {
      return `${fieldLabel} definido: ${newLabel}`;
    }
    return `${fieldLabel} alterado: ${oldLabel} → ${newLabel}`;
  }

  // Note ou observação
  if (entry.note) {
    return entry.note;
  }

  return 'Registro atualizado';
};

export default function GovernanceIssueDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isManager = hasRole(['ADMIN', 'MANAGER']);
  const actorIdentifier = authService.getActorIdentifier();
  const [issue, setIssue] = useState<GovernanceIssueDetail | null>(null);
  const [history, setHistory] = useState<GovernanceIssueHistoryDto[]>([]);
  const [duplicateGroup, setDuplicateGroup] = useState<DuplicateGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // States para ações (atribuição e status)
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusValue, setStatusValue] = useState<IssueStatus>('OPEN');
  const [statusIgnoredReason, setStatusIgnoredReason] = useState('');

  const canAssign = isManager;
  const canResolve = isManager;

  const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return governanceTexts.general.notAvailable;
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR');
    } catch {
      return governanceTexts.general.notAvailable;
    }
  };

  const formatDateTime = (dateStr: string | null | undefined): string => {
    if (!dateStr) return governanceTexts.general.notAvailable;
    try {
      return new Date(dateStr).toLocaleString('pt-BR');
    } catch {
      return governanceTexts.general.notAvailable;
    }
  };

  const getDueDateValue = (currentIssue: GovernanceIssueDetail | null) =>
    currentIssue?.slaDueAt ?? currentIssue?.dueDate ?? null;

  const startOfToday = () => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  };

  const getSlaStatus = (currentIssue: GovernanceIssueDetail | null) => {
    // Se status é fechado (RESOLVED ou IGNORED), mostrar badge especial
    if (currentIssue?.status === 'RESOLVED' || currentIssue?.status === 'IGNORED') {
      return {
        label: governanceTexts.status.labels[currentIssue.status],
        variant: 'secondary' as const,
        className: 'bg-muted text-muted-foreground',
        icon: 'check' as const,
      };
    }

    const dueDateValue = getDueDateValue(currentIssue);
    if (!dueDateValue) {
      return {
        label: governanceTexts.governance.statusLabels.noDueDate,
        variant: 'secondary' as const,
        className: 'bg-muted text-muted-foreground',
        icon: 'none' as const,
      };
    }

    const dueDate = new Date(dueDateValue);
    if (Number.isNaN(dueDate.getTime())) {
      return {
        label: governanceTexts.governance.statusLabels.noDueDate,
        variant: 'secondary' as const,
        className: 'bg-muted text-muted-foreground',
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
        icon: 'alert' as const,
      };
    }
    if (due.getTime() === today.getTime()) {
      return {
        label: governanceTexts.governance.statusLabels.dueToday,
        variant: 'secondary' as const,
        className: 'bg-warning text-warning-foreground',
        icon: 'warning' as const,
      };
    }
    return {
      label: governanceTexts.governance.statusLabels.onTrack,
      variant: 'secondary' as const,
      className: 'bg-success text-success-foreground',
      icon: 'check' as const,
    };
  };

  const handleStatusChange = async () => {
    if (!issue) return;
    if (statusValue === 'IGNORED' && !statusIgnoredReason.trim()) {
      toast({
        title: governanceTexts.general.attentionTitle,
        description: governanceTexts.governance.statusDialog.ignoredReasonRequired,
      });
      return;
    }

    setActionLoading(true);
    try {
      const updated = await governanceService.changeStatus(
        issue.id,
        statusValue,
        statusValue === 'IGNORED' ? statusIgnoredReason.trim() : undefined
      );
      setIssue((prev) => prev ? { ...prev, status: updated?.status ?? statusValue } : prev);
      toast({ title: governanceTexts.general.update, description: governanceTexts.governance.statusDialog.success });
      setStatusDialogOpen(false);
      setStatusIgnoredReason('');
      // Recarregar histórico
      const newHistory = await governanceService.getIssueHistory(issue.id);
      setHistory(newHistory);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : (err as { message?: string })?.message || governanceTexts.governance.toasts.statusError;
      toast({ title: governanceTexts.general.errorTitle, description: message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const loadDuplicateGroup = async (currentIssue: GovernanceIssueDetail) => {
    const localGroup = currentIssue.duplicateGroup ?? null;
    if (localGroup?.articles?.length) {
      setDuplicateGroup(localGroup);
      return;
    }

    const hash = currentIssue.duplicateHash ?? null;
    if (!hash) {
      setDuplicateGroup(null);
      return;
    }

    try {
      const groups = await duplicatesService.listGroups();
      const match = groups.find((group) => group.hash === hash) ?? null;
      setDuplicateGroup(match);
    } catch {
      setDuplicateGroup(null);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const result = await governanceService.getIssueById(id);
        setIssue(result);
        if (result?.type === 'DUPLICATE_CONTENT') {
          await loadDuplicateGroup(result);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : governanceTexts.issueDetail.loadError;
        setError(message);
        toast({ title: governanceTexts.general.errorTitle, description: message, variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!id) return;
      setHistoryLoading(true);
      try {
        const result = await governanceService.getIssueHistory(id);
        setHistory(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : governanceTexts.issueDetail.historyError;
        toast({ title: governanceTexts.general.errorTitle, description: message, variant: 'destructive' });
      } finally {
        setHistoryLoading(false);
      }
    };

    fetchHistory();
  }, [id]);

  const timeline = useMemo(() => {
    return history.map((entry, index) => {
      const humanPhrase = generateHumanPhrase(entry);
      const fieldLabel = humanizeHistoryField(entry.field);

      return {
        id: entry.id ?? `${entry.changedAt}-${index}`,
        date: formatDateTime(entry.changedAt),
        changedBy: entry.changedBy,
        label: fieldLabel,
        phrase: humanPhrase,
        note: entry.note,
        field: entry.field,
      };
    });
  }, [history]);

  const severityOrder: Record<IssueSeverity, string> = governanceTexts.severity.shortLabels;
  const metadataDescription = issue?.description || issue?.details || null;
  const metadataRecommendation = issue?.recommendation || null;
  const metadataMessage = issue?.message?.trim() || null;
  const isAssignedToUser = useMemo(() => {
    if (!issue || !actorIdentifier) return false;
    const actor = actorIdentifier.toLowerCase();
    return [issue.responsibleId, issue.responsible, issue.responsibleName]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase() === actor);
  }, [actorIdentifier, issue]);

  return (
    <MainLayout>
      <PageHeader
        title={governanceTexts.issueDetail.title}
        description={governanceTexts.issueDetail.description}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => navigate('/governance')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {governanceTexts.issueDetail.backToList}
            </Button>
            {issue && (
              <>
                {canAssign && (
                  <Button
                    variant="default"
                    onClick={() => {
                      setAssignDialogOpen(true);
                    }}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    {governanceTexts.governance.list.actionAssign}
                  </Button>
                )}
                {canResolve && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setStatusValue(issue.status || 'OPEN');
                      setStatusIgnoredReason('');
                      setStatusDialogOpen(true);
                    }}
                  >
                    <ClipboardCheck className="h-4 w-4 mr-2" />
                    {governanceTexts.governance.list.actionStatus}
                  </Button>
                )}
              </>
            )}
          </div>
        }
      />

      {loading ? (
        <div className="space-y-6">
          <LoadingSkeleton variant="card" />
          <LoadingSkeleton variant="table" rows={3} />
        </div>
      ) : error ? (
        <div className="card-metric">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h3 className="font-semibold text-lg mb-2">{governanceTexts.issueDetail.loadError}</h3>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => navigate('/governance')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {governanceTexts.general.back}
            </Button>
          </div>
        </div>
      ) : !issue ? (
        <EmptyState
          icon={AlertCircle}
          title={governanceTexts.issueDetail.notFoundTitle}
          description={governanceTexts.issueDetail.notFoundDescription}
        />
      ) : !isManager && !isAssignedToUser ? (
        <EmptyState
          icon={AlertCircle}
          title={governanceTexts.issueDetail.unauthorizedTitle}
          description={governanceTexts.issueDetail.unauthorizedDescription}
        />
      ) : (
        <div className="space-y-6">
          <div className="card-metric">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">{governanceTexts.issueDetail.typeLabel}</p>
                  <h3 className="text-xl font-semibold">
                    {issue.typeDisplayName || issue.displayName || ISSUE_TYPE_LABELS[issue.type] || issue.type}
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">{governanceTexts.issueDetail.systemLabel}</p>
                    <p className="font-medium">{issue.systemName || issue.systemCode || governanceTexts.general.notAvailable}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{governanceTexts.issueDetail.manualLabel}</p>
                    <p className="font-medium">{issue.articleTitle?.trim() || (issue.articleId != null ? `Artigo #${issue.articleId}` : '-')}</p>
                    <p className="text-xs text-muted-foreground mt-1">{issue.message?.trim() || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{governanceTexts.issueDetail.statusLabel}</p>
                    <StatusBadge status={issue.status || 'OPEN'} />
                  </div>
                  <div>
                    <p className="text-muted-foreground">{governanceTexts.issueDetail.impactLabel}</p>
                    <StatusBadge status={issue.severity || 'INFO'} />
                  </div>
                  <div>
                    <p className="text-muted-foreground">{governanceTexts.issueDetail.responsibleLabel}</p>
                    <p className="font-medium">
                      {issue.responsibleName || issue.responsible || governanceTexts.general.notAvailable}
                    </p>
                    {issue.responsibleType && issue.responsibleId && (
                      <p className="text-xs text-muted-foreground">
                        {(governanceTexts.governance.assignDialog.responsibleTypeOptions as Record<string, string>)[issue.responsibleType] ?? issue.responsibleType}: {issue.responsibleId}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-muted-foreground">{governanceTexts.issueDetail.createdAtLabel}</p>
                    <p className="font-medium">{formatDateTime(issue.createdAt)}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-muted/30 p-4 min-w-[220px]">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarClock className="h-4 w-4" />
                  {governanceTexts.issueDetail.dueDateLabel}
                </div>
                <div className="mt-2">
                  <Badge variant={getSlaStatus(issue).variant} className={`${getSlaStatus(issue).className} flex items-center gap-1 w-fit`}>
                    {getSlaStatus(issue).icon === 'alert' && <AlertOctagon className="h-3 w-3" />}
                    {getSlaStatus(issue).icon === 'warning' && <Clock className="h-3 w-3" />}
                    {getSlaStatus(issue).icon === 'check' && <CheckCircle2 className="h-3 w-3" />}
                    {getSlaStatus(issue).label}
                  </Badge>
                </div>
                {issue.status !== 'RESOLVED' && issue.status !== 'IGNORED' && (
                  <>
                    <p className="text-sm text-muted-foreground mt-2">
                      {governanceTexts.issueDetail.dueDatePrefix} {formatDate(getDueDateValue(issue))}
                    </p>
                    {issue.slaDays !== null && issue.slaDays !== undefined && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {governanceTexts.issueDetail.slaDaysPrefix} {issue.slaDays} {governanceTexts.issueDetail.daysLabel}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {(metadataDescription || metadataRecommendation || metadataMessage) && (
              <div className="card-metric space-y-4">
                {metadataDescription && (
                  <div>
                    <h4 className="text-sm font-semibold">{governanceTexts.issueDetail.whatIsItTitle}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{metadataDescription}</p>
                  </div>
                )}
                {metadataRecommendation && (
                  <div>
                    <h4 className="text-sm font-semibold">{governanceTexts.issueDetail.howToResolveTitle}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{metadataRecommendation}</p>
                  </div>
                )}
                {metadataMessage && (
                  <div>
                    <h4 className="text-sm font-semibold">Mensagem</h4>
                    <p className="text-sm text-muted-foreground mt-1">{metadataMessage}</p>
                  </div>
                )}
              </div>
            )}

            <div className="card-metric space-y-4">
              <h4 className="text-sm font-semibold">{governanceTexts.issueDetail.metadataTitle}</h4>
              <div className="grid grid-cols-1 gap-2 text-sm text-muted-foreground">
                <div>
                  <span className="font-medium text-foreground">{governanceTexts.issueDetail.impactLabel}:</span>{' '}
                  {severityOrder[issue.severity] || governanceTexts.general.notAvailable}
                </div>
                <div>
                  <span className="font-medium text-foreground">{governanceTexts.issueDetail.statusLabel}:</span>{' '}
                  {governanceTexts.status.labels[issue.status] || governanceTexts.general.notAvailable}
                </div>
                <div>
                  <span className="font-medium text-foreground">{governanceTexts.issueDetail.dueDateLabel}:</span>{' '}
                  {formatDate(getDueDateValue(issue))}
                </div>
              </div>
            </div>
          </div>

          {issue.type === 'DUPLICATE_CONTENT' && (
            <div className="card-metric space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">{governanceTexts.issueDetail.duplicatesTitle}</h4>
                {duplicateGroup?.hash && (
                  <span className="text-xs text-muted-foreground">
                    {governanceTexts.issueDetail.duplicatesHashLabel}: {duplicateGroup.hash}
                  </span>
                )}
              </div>
              {duplicateGroup?.articles?.length ? (
                <div className="space-y-2">
                  {duplicateGroup.articles.map((article, idx) => (
                    <div
                      key={`${article.id}-${idx}`}
                      className="rounded-md border border-border bg-muted/40 p-3 text-sm"
                    >
                      <p className="font-medium">{article.title || governanceTexts.general.notAvailable}</p>
                      <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span>{governanceTexts.issueDetail.systemLabel}: {article.systemCode || governanceTexts.general.notAvailable}</span>
                        <span>{governanceTexts.issueDetail.updatedAtLabel}: {formatDate(article.updatedAt)}</span>
                        {article.url ? (
                          <a
                            href={article.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary hover:underline"
                          >
                            {governanceTexts.issueDetail.viewManual}
                          </a>
                        ) : (
                          <span>{governanceTexts.issueDetail.unavailableUrl}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{governanceTexts.issueDetail.duplicatesEmpty}</p>
              )}
            </div>
          )}

          <div className="card-metric">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold">{governanceTexts.issueDetail.historyTitle}</h4>
              {historyLoading && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {governanceTexts.issueDetail.historyLoading}
                </div>
              )}
            </div>
            {historyLoading ? (
              <LoadingSkeleton variant="table" rows={3} />
            ) : timeline.length === 0 ? (
              <EmptyState
                icon={AlertCircle}
                title={governanceTexts.issueDetail.historyEmptyTitle}
                description={governanceTexts.issueDetail.historyEmptyDescription}
              />
            ) : (
              <ul className="space-y-3">
                {timeline.map((entry) => (
                  <li key={entry.id} className="rounded-md border border-border bg-muted/40 p-3">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{entry.phrase}</p>
                        {entry.note && entry.note !== entry.phrase && (
                          <p className="text-xs text-muted-foreground mt-1 italic">"{entry.note}"</p>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground text-right whitespace-nowrap">
                        <div className="font-medium">{entry.date}</div>
                        {entry.changedBy && <div>{governanceTexts.issueDetail.changedByLabel} {entry.changedBy}</div>}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <CreateManualAssignmentDialog
        open={canAssign && assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        issueId={issue?.id}
        initialArticleId={issue?.articleId != null ? String(issue.articleId) : ''}
        onCreated={async () => {
          if (!id) return;
          const [nextIssue, nextHistory] = await Promise.all([
            governanceService.getIssueById(id),
            governanceService.getIssueHistory(id),
          ]);
          setIssue(nextIssue);
          setHistory(nextHistory);
        }}
      />

      {/* Dialog de Status */}
      {canResolve && (
        <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{governanceTexts.governance.statusDialog.title}</DialogTitle>
              <DialogDescription>Atualize o status da pendência e informe o motivo quando necessário.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{governanceTexts.governance.statusDialog.statusLabel}</Label>
                <Select value={statusValue} onValueChange={(value) => setStatusValue(value as IssueStatus)}>
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
                    onChange={(e) => setStatusIgnoredReason(e.target.value)}
                  />
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
                {governanceTexts.governance.statusDialog.cancel}
              </Button>
              <Button onClick={handleStatusChange} disabled={actionLoading}>
                {actionLoading ? (
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
      )}
    </MainLayout>
  );
}
