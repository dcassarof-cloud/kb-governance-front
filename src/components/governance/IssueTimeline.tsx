// =====================================================
// ISSUE TIMELINE - Consisa KB Governance (Sprint 5)
// =====================================================

import { History, User, ArrowRight, Loader2 } from 'lucide-react';
import { IssueHistoryEntry } from '@/types';
import { formatDateTimePtBr } from '@/lib/sla-utils';
import { cn } from '@/lib/utils';

interface IssueTimelineProps {
  history: IssueHistoryEntry[];
  isLoading: boolean;
  error: string | null;
}

const ACTION_LABELS: Record<string, string> = {
  CREATED: 'Issue criada',
  STATUS_CHANGED: 'Status alterado',
  ASSIGNED: 'Responsável atribuído',
  REASSIGNED: 'Responsável alterado',
  RESOLVED: 'Issue resolvida',
  IGNORED: 'Issue ignorada',
  REOPENED: 'Issue reaberta',
  COMMENT: 'Comentário adicionado',
};

const ACTION_COLORS: Record<string, string> = {
  CREATED: 'bg-blue-500',
  STATUS_CHANGED: 'bg-purple-500',
  ASSIGNED: 'bg-green-500',
  REASSIGNED: 'bg-amber-500',
  RESOLVED: 'bg-emerald-500',
  IGNORED: 'bg-gray-500',
  REOPENED: 'bg-orange-500',
  COMMENT: 'bg-cyan-500',
};

function getActionLabel(action: string): string {
  return ACTION_LABELS[action] || action;
}

function getActionColor(action: string): string {
  return ACTION_COLORS[action] || 'bg-gray-400';
}

export function IssueTimeline({ history, isLoading, error }: IssueTimelineProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Carregando histórico...
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-4 text-center text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <History className="h-10 w-10 mb-2 opacity-50" />
        <p className="text-sm">Nenhum histórico disponível</p>
      </div>
    );
  }

  // Ordena do mais recente para o mais antigo
  const sortedHistory = [...history].sort((a, b) => {
    const dateA = new Date(a.changedAt).getTime();
    const dateB = new Date(b.changedAt).getTime();
    return dateB - dateA;
  });

  return (
    <div className="space-y-0">
      <div className="flex items-center gap-2 mb-4">
        <History className="h-5 w-5 text-muted-foreground" />
        <h4 className="font-semibold">Histórico de alterações</h4>
        <span className="text-sm text-muted-foreground">({history.length} eventos)</span>
      </div>

      <div className="relative">
        {/* Linha vertical */}
        <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-border" />

        <div className="space-y-4">
          {sortedHistory.map((entry, index) => (
            <div key={entry.id || `history-${index}`} className="relative pl-10">
              {/* Ponto na linha */}
              <div
                className={cn(
                  'absolute left-1.5 w-3.5 h-3.5 rounded-full border-2 border-background',
                  getActionColor(entry.action)
                )}
              />

              {/* Conteúdo */}
              <div className="bg-muted/30 rounded-lg p-3 border border-border">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="font-medium text-sm">{getActionLabel(entry.action)}</span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDateTimePtBr(entry.changedAt)}
                  </span>
                </div>

                {/* Ator */}
                {(entry.actor || entry.changedBy) && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                    <User className="h-3 w-3" />
                    <span>{entry.actor || entry.changedBy}</span>
                  </div>
                )}

                {/* Mudança de valor */}
                {(entry.oldValue || entry.newValue) && (
                  <div className="flex items-center gap-2 text-xs mt-2 p-2 bg-background/50 rounded">
                    {entry.oldValue && (
                      <span className="px-2 py-0.5 bg-muted rounded">{entry.oldValue}</span>
                    )}
                    {entry.oldValue && entry.newValue && (
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    )}
                    {entry.newValue && (
                      <span className="px-2 py-0.5 bg-primary/10 text-primary rounded">{entry.newValue}</span>
                    )}
                  </div>
                )}

                {/* Status (fallback para histórico antigo) */}
                {entry.status && !entry.newValue && (
                  <div className="text-xs mt-1">
                    <span className="text-muted-foreground">Status: </span>
                    <span className="font-medium">{entry.status}</span>
                  </div>
                )}

                {/* Nota */}
                {entry.note && (
                  <div className="text-xs text-muted-foreground mt-2 italic border-l-2 border-muted pl-2">
                    {entry.note}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
