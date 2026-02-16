import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ClipboardCheck,
  Eye,
  Loader2,
  UserPlus,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { ApiErrorBanner } from '@/components/shared/ApiErrorBanner';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ApiError } from '@/components/ui/ApiError';
import { governanceTexts } from '@/governanceTexts';
import type { GovernanceIssueDto, IssueSeverity, IssueStatus } from '@/types';
import { ISSUE_TYPE_LABELS } from '@/features/governance/hooks/useGovernance';
import { CreateManualAssignmentDialog } from '@/features/governance/components/CreateManualAssignmentDialog';
import { toast } from '@/hooks/use-toast';

interface GovernanceTableProps {
  issues: GovernanceIssueDto[];
  issuesLoading: boolean;
  issuesError: string | null;
  totalPages: number;
  page: number;
  canAssign: boolean;
  canResolve: boolean;
  actionLoading: { id: string; action: string } | null;
  onRefresh: () => void;
  onPageChange: (nextPage: number) => void;
  onAssignClick: (issue: GovernanceIssueDto) => void;
  onStatusClick: (issue: GovernanceIssueDto) => void;
  onClearFilters: () => void;
  getDueDateValue: (issue: GovernanceIssueDto) => string | null;
  getSlaStatus: (issue: GovernanceIssueDto) => {
    label: string;
    variant: 'secondary' | 'destructive';
    className: string;
    priority: number;
    icon: 'check' | 'warning' | 'alert' | 'none';
  };
  getOverdueDays: (issue: GovernanceIssueDto) => number | null;
  getShortSeverityLabel: (severity?: IssueSeverity | null) => string;
  getStatusLabel: (status?: IssueStatus | null) => string;
  getPriorityLevel: (issue: GovernanceIssueDto) => IssueSeverity;
  getPriorityClasses: (priority: IssueSeverity) => string;
  formatDate: (dateStr: string | null | undefined) => string;
  assignState: {
    target: GovernanceIssueDto | null;
    responsibleType: string;
    responsibleId: string;
    responsibleName: string;
    dueDate: string;
  };
  statusState: {
    target: GovernanceIssueDto | null;
    value: IssueStatus;
    ignoredReason: string;
  };
  onStatusFieldChange: (payload: Partial<GovernanceTableProps['statusState']>) => void;
  onAssignClose: () => void;
  onStatusSave: () => void;
  onStatusClose: () => void;
}

/**
 * Tabela principal de issues de governança.
 *
 * Fluxo de UX:
 * - loading: skeleton da tabela;
 * - erro: banner + detalhe + empty state com ação de recarga;
 * - vazio: orientação para limpar filtros;
 * - sucesso: tabela com ações por item (atribuir, atualizar status, detalhar).
 */
export function GovernanceTable({
  issues,
  issuesLoading,
  issuesError,
  totalPages,
  page,
  canAssign,
  canResolve,
  actionLoading,
  onRefresh,
  onPageChange,
  onAssignClick,
  onStatusClick,
  onClearFilters,
  getDueDateValue,
  getSlaStatus,
  getOverdueDays,
  getShortSeverityLabel,
  getStatusLabel,
  getPriorityLevel,
  getPriorityClasses,
  formatDate,
  assignState,
  statusState,
  onStatusFieldChange,
  onAssignClose,
  onStatusSave,
  onStatusClose,
}: GovernanceTableProps) {
  const navigate = useNavigate();

  return (
    <>
      <div className="card-metric">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">{governanceTexts.governance.list.title}</h3>
          <span className="text-sm text-muted-foreground">
            {governanceTexts.governance.list.count(issues.length)}
          </span>
        </div>

        {issuesLoading ? (
          <LoadingSkeleton variant="table" rows={5} />
        ) : issuesError ? (
          <>
            <ApiErrorBanner
              title="Falha ao carregar governança"
              description={issuesError}
              onRetry={onRefresh}
            />
            <ApiError
              title={governanceTexts.governance.list.loadError}
              description={issuesError}
              actionLabel={governanceTexts.general.retry}
              onAction={onRefresh}
            />
            <EmptyState
              icon={AlertTriangle}
              title={governanceTexts.governance.list.loadError}
              description="Não foi possível carregar a fila de pendências."
              action={{ label: 'Recarregar', onClick: onRefresh }}
            />
          </>
        ) : issues.length === 0 ? (
          <EmptyState
            icon={AlertTriangle}
            title={governanceTexts.governance.list.emptyTitle}
            description={governanceTexts.governance.list.emptyDescription}
            action={{ label: 'Limpar filtros', onClick: onClearFilters }}
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
                {issues.map((issue, index) => {
                  const issueId = issue?.id || `issue-${index}`;
                  const system = issue?.systemName || issue?.systemCode || governanceTexts.general.notAvailable;
                  const manualTitle = issue?.articleTitle || issue?.title || governanceTexts.general.notAvailable;
                  const manualDetails = issue?.message || issue?.details || '';
                  const status = issue?.status || 'OPEN';
                  const responsible = issue?.assignedAgentName || issue?.responsibleName || issue?.responsible || governanceTexts.general.notAvailable;
                  const slaStatus = getSlaStatus(issue);
                  const dueDate = formatDate(getDueDateValue(issue));
                  const overdueDays = getOverdueDays(issue);
                  const situationSummary = `${getShortSeverityLabel(issue.severity)} – ${getStatusLabel(status)}${
                    overdueDays ? ` há ${overdueDays} dia${overdueDays !== 1 ? 's' : ''}` : ''
                  }`;
                  const priorityLevel = getPriorityLevel(issue);

                  const isActionLoading = (action: string) => actionLoading?.id === issueId && actionLoading?.action === action;

                  return (
                    <tr key={issueId} className="border-t border-border hover:bg-muted/30 transition-colors">
                      <td className="p-4">
                        <div className="space-y-2">
                          <Badge variant="secondary">
                            {issue?.typeDisplayName ||
                              issue?.displayName ||
                              ISSUE_TYPE_LABELS[issue?.type as keyof typeof ISSUE_TYPE_LABELS] ||
                              issue?.type ||
                              governanceTexts.general.notAvailable}
                          </Badge>
                          <span
                            className={`inline-flex w-fit items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getPriorityClasses(
                              priorityLevel,
                            )}`}
                          >
                            {priorityLevel}
                          </span>
                          <div className="text-sm text-muted-foreground">{system}</div>
                          <div className="font-medium">{manualTitle}</div>
                          {manualDetails && (
                            <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{manualDetails}</div>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-2">
                          <StatusBadge status={issue.severity || 'INFO'} />
                          <span className="text-xs text-muted-foreground">{situationSummary}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        {issue.assignedAgentName || issue.assignedAgentId || issue.responsible || issue.responsibleName ? (
                          <div className="space-y-1">
                            <span className="text-sm font-medium text-foreground">{responsible}</span>
                            {(issue.assignedAgentId || (issue.responsibleType && issue.responsibleId)) && (
                              <div className="text-xs text-muted-foreground">
                                {issue.assignedAgentId
                                  ? `ID do agente: ${issue.assignedAgentId}`
                                  : `${(governanceTexts.governance.assignDialog.responsibleTypeOptions as Record<string, string>)[issue.responsibleType || ''] ?? issue.responsibleType}: ${issue.responsibleId}`}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2">
                            <span className="text-sm font-medium text-warning">{governanceTexts.governance.filters.unassigned}</span>
                            {canAssign && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onAssignClick(issue);
                                }}
                                className="w-fit"
                              >
                                <UserPlus className="h-4 w-4 mr-1" />
                                {governanceTexts.governance.list.actionAssign}
                              </Button>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          <Badge variant={slaStatus.variant} className={`${slaStatus.className} flex items-center gap-1 w-fit`}>
                            {slaStatus.icon === 'alert' && <AlertOctagon className="h-3 w-3" />}
                            {slaStatus.icon === 'warning' && <Clock className="h-3 w-3" />}
                            {slaStatus.icon === 'check' && <CheckCircle2 className="h-3 w-3" />}
                            {slaStatus.label}
                          </Badge>
                          {issue.status !== 'RESOLVED' && issue.status !== 'IGNORED' && (
                            <span className="text-xs text-muted-foreground">{dueDate}</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-2">
                          {canAssign && (
                            <Button variant="outline" size="sm" onClick={() => onAssignClick(issue)}>
                              <UserPlus className="h-4 w-4 mr-1" />
                              {governanceTexts.governance.list.actionAssign}
                            </Button>
                          )}


                          {canResolve && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onStatusClick(issue)}
                              disabled={isActionLoading('status')}
                            >
                              <ClipboardCheck className="h-4 w-4 mr-1" />
                              Revalidar / Ignorar
                            </Button>
                          )}

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

      {!issuesLoading && !issuesError && totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">{governanceTexts.general.page(page, totalPages)}</p>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page <= 1}>
              {governanceTexts.general.previous}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
            >
              {governanceTexts.general.next}
            </Button>
          </div>
        </div>
      )}

      {canResolve && (
        <Dialog
          open={Boolean(statusState.target)}
          onOpenChange={(open) => {
            if (!open) {
              onStatusClose();
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{governanceTexts.governance.statusDialog.title}</DialogTitle>
              <DialogDescription>Atualize o status da pendência selecionada.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{governanceTexts.governance.statusDialog.statusLabel}</Label>
                <Select
                  value={statusState.value}
                  onValueChange={(value) => onStatusFieldChange({ value: value as IssueStatus })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={governanceTexts.governance.statusDialog.statusPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OPEN">Revalidar</SelectItem>
                    <SelectItem value="IGNORED">Ignorar</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {statusState.value === 'IGNORED' && (
                <div className="space-y-2">
                  <Label>{governanceTexts.governance.statusDialog.ignoredReasonLabel}</Label>
                  <Input
                    placeholder={governanceTexts.governance.statusDialog.ignoredReasonPlaceholder}
                    value={statusState.ignoredReason}
                    onChange={(event) => onStatusFieldChange({ ignoredReason: event.target.value })}
                  />
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onStatusClose}>
                {governanceTexts.governance.statusDialog.cancel}
              </Button>
              <Button
                onClick={() => {
                  if (statusState.value === 'IGNORED' && !statusState.ignoredReason.trim()) {
                    toast({
                      title: governanceTexts.general.attentionTitle,
                      description: governanceTexts.governance.statusDialog.ignoredReasonRequired,
                    });
                    return;
                  }
                  onStatusSave();
                }}
                disabled={Boolean(statusState.target && actionLoading?.action === 'status')}
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
      )}

      <CreateManualAssignmentDialog
        open={Boolean(assignState.target)}
        onOpenChange={(open) => {
          if (!open) {
            onAssignClose();
          }
        }}
        issueId={assignState.target?.id}
        initialArticleId={assignState.target?.articleId ?? ''}
      />
    </>
  );
}
