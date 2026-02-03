import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CalendarClock, Loader2 } from 'lucide-react';

import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { governanceService } from '@/services/governance.service';
import { duplicatesService } from '@/services/duplicates.service';
import {
  GovernanceIssueDetail,
  GovernanceIssueHistoryDto,
  DuplicateGroup,
  IssueSeverity,
} from '@/types';
import { toast } from '@/hooks/use-toast';

const ISSUE_TYPE_LABELS: Record<string, string> = {
  REVIEW_REQUIRED: 'Revisão necessária',
  NOT_AI_READY: 'Não pronto para IA',
  DUPLICATE_CONTENT: 'Conteúdo Duplicado',
  INCOMPLETE_CONTENT: 'Conteúdo Incompleto',
};

export default function GovernanceIssueDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [issue, setIssue] = useState<GovernanceIssueDetail | null>(null);
  const [history, setHistory] = useState<GovernanceIssueHistoryDto[]>([]);
  const [duplicateGroup, setDuplicateGroup] = useState<DuplicateGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR');
    } catch {
      return '-';
    }
  };

  const formatDateTime = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleString('pt-BR');
    } catch {
      return '-';
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
    const dueDateValue = getDueDateValue(currentIssue);
    if (!dueDateValue) {
      return { label: 'SEM SLA', variant: 'secondary' as const, className: 'bg-muted text-muted-foreground' };
    }

    const dueDate = new Date(dueDateValue);
    if (Number.isNaN(dueDate.getTime())) {
      return { label: 'SEM SLA', variant: 'secondary' as const, className: 'bg-muted text-muted-foreground' };
    }

    const today = startOfToday();
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);

    if (due < today) {
      return { label: 'VENCIDO', variant: 'destructive' as const, className: '' };
    }
    if (due.getTime() === today.getTime()) {
      return { label: 'HOJE', variant: 'secondary' as const, className: 'bg-warning text-warning-foreground' };
    }
    return { label: 'EM DIA', variant: 'secondary' as const, className: 'bg-success text-success-foreground' };
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
        const message = err instanceof Error ? err.message : 'Erro ao carregar detalhes da issue';
        setError(message);
        toast({ title: 'Erro', description: message, variant: 'destructive' });
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
        const message = err instanceof Error ? err.message : 'Erro ao carregar histórico';
        toast({ title: 'Erro', description: message, variant: 'destructive' });
      } finally {
        setHistoryLoading(false);
      }
    };

    fetchHistory();
  }, [id]);

  const timeline = useMemo(() => {
    return history.map((entry, index) => {
      const field = entry.field ? entry.field.replace(/_/g, ' ').toLowerCase() : null;
      const oldValue = entry.oldValue ?? null;
      const newValue = entry.newValue ?? null;
      const status = entry.status ?? null;
      const changeLabel = field
        ? `${field.charAt(0).toUpperCase()}${field.slice(1)}`
        : status
          ? 'Status'
          : 'Atualização';
      const values = oldValue || newValue ? `${oldValue ?? '-'} → ${newValue ?? '-'}` : status ?? entry.note ?? '-';

      return {
        id: entry.id ?? `${entry.changedAt}-${index}`,
        date: formatDateTime(entry.changedAt),
        changedBy: entry.changedBy,
        label: changeLabel,
        values,
        note: entry.note,
      };
    });
  }, [history]);

  const severityOrder: Record<IssueSeverity, string> = {
    LOW: 'Baixa',
    MEDIUM: 'Média',
    HIGH: 'Alta',
    CRITICAL: 'Crítica',
  };

  return (
    <MainLayout>
      <PageHeader
        title="Detalhe da issue"
        description="Entenda o contexto, SLA e histórico da pendência"
        actions={
          <Button variant="outline" onClick={() => navigate('/governance')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para governança
          </Button>
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
            <h3 className="font-semibold text-lg mb-2">Erro ao carregar a issue</h3>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => navigate('/governance')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </div>
        </div>
      ) : !issue ? (
        <EmptyState
          icon={AlertCircle}
          title="Issue não encontrada"
          description="Verifique o link ou volte para a governança para selecionar outra issue."
        />
      ) : (
        <div className="space-y-6">
          <div className="card-metric">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Tipo</p>
                  <h3 className="text-xl font-semibold">
                    {issue.displayName || ISSUE_TYPE_LABELS[issue.type] || issue.type}
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Sistema</p>
                    <p className="font-medium">{issue.systemName || issue.systemCode || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Manual</p>
                    <p className="font-medium">{issue.articleTitle || issue.title || 'Manual sem título'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <StatusBadge status={issue.status || 'OPEN'} />
                  </div>
                  <div>
                    <p className="text-muted-foreground">Severidade</p>
                    <StatusBadge status={issue.severity || 'LOW'} />
                  </div>
                  <div>
                    <p className="text-muted-foreground">Responsável</p>
                    <p className="font-medium">
                      {issue.responsibleName || issue.responsible || 'Não atribuído'}
                    </p>
                    {issue.responsibleType && issue.responsibleId && (
                      <p className="text-xs text-muted-foreground">
                        {issue.responsibleType}: {issue.responsibleId}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-muted-foreground">Criada em</p>
                    <p className="font-medium">{formatDateTime(issue.createdAt)}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-muted/30 p-4 min-w-[220px]">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarClock className="h-4 w-4" />
                  SLA
                </div>
                <div className="mt-2">
                  <Badge variant={getSlaStatus(issue).variant} className={getSlaStatus(issue).className}>
                    {getSlaStatus(issue).label}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Vence em: {formatDate(getDueDateValue(issue))}
                </p>
                {issue.slaDays !== null && issue.slaDays !== undefined && (
                  <p className="text-xs text-muted-foreground mt-1">SLA: {issue.slaDays} dias</p>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card-metric space-y-4">
              <div>
                <h4 className="text-sm font-semibold">O que é isso?</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {issue.description || issue.details || 'Descrição indisponível no momento.'}
                </p>
              </div>
              <div>
                <h4 className="text-sm font-semibold">Como resolver</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {issue.recommendation || issue.message || 'Recomendação indisponível no momento.'}
                </p>
              </div>
            </div>

            <div className="card-metric space-y-4">
              <h4 className="text-sm font-semibold">Metadados da issue</h4>
              <div className="grid grid-cols-1 gap-2 text-sm text-muted-foreground">
                <div>
                  <span className="font-medium text-foreground">Severidade:</span>{' '}
                  {severityOrder[issue.severity] || issue.severity}
                </div>
                <div>
                  <span className="font-medium text-foreground">Status atual:</span> {issue.status}
                </div>
                <div>
                  <span className="font-medium text-foreground">SLA:</span> {formatDate(getDueDateValue(issue))}
                </div>
              </div>
            </div>
          </div>

          {issue.type === 'DUPLICATE_CONTENT' && (
            <div className="card-metric space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">Grupo de artigos duplicados</h4>
                {duplicateGroup?.hash && (
                  <span className="text-xs text-muted-foreground">Hash: {duplicateGroup.hash}</span>
                )}
              </div>
              {duplicateGroup?.articles?.length ? (
                <div className="space-y-2">
                  {duplicateGroup.articles.map((article, idx) => (
                    <div
                      key={`${article.id}-${idx}`}
                      className="rounded-md border border-border bg-muted/40 p-3 text-sm"
                    >
                      <p className="font-medium">{article.title || 'Sem título'}</p>
                      <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span>Sistema: {article.systemCode || 'N/A'}</span>
                        <span>Atualizado: {formatDate(article.updatedAt)}</span>
                        {article.url ? (
                          <a
                            href={article.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary hover:underline"
                          >
                            Abrir artigo
                          </a>
                        ) : (
                          <span>URL indisponível</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum artigo duplicado retornado pelo backend.</p>
              )}
            </div>
          )}

          <div className="card-metric">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold">Timeline da issue</h4>
              {historyLoading && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando histórico...
                </div>
              )}
            </div>
            {historyLoading ? (
              <LoadingSkeleton variant="table" rows={3} />
            ) : timeline.length === 0 ? (
              <EmptyState
                icon={AlertCircle}
                title="Nenhum histórico encontrado"
                description="Ainda não há alterações registradas para essa issue."
              />
            ) : (
              <ul className="space-y-3">
                {timeline.map((entry) => (
                  <li key={entry.id} className="rounded-md border border-border bg-muted/40 p-3">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{entry.label}</p>
                        <p className="text-xs text-muted-foreground">{entry.values}</p>
                        {entry.note && <p className="text-xs text-muted-foreground mt-1">{entry.note}</p>}
                      </div>
                      <div className="text-xs text-muted-foreground text-right">
                        <div>{entry.date}</div>
                        {entry.changedBy && <div>por {entry.changedBy}</div>}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </MainLayout>
  );
}
