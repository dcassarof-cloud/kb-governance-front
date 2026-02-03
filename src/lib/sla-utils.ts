// =====================================================
// SLA UTILITIES - Consisa KB Governance (Sprint 5)
// =====================================================

import { IssueStatus } from '@/types';

/**
 * Verifica se uma issue está vencida (SLA expirado)
 * Considera apenas issues que não estão resolvidas ou ignoradas
 */
export function isOverdue(slaDueAt: string | null | undefined, status: IssueStatus): boolean {
  if (!slaDueAt) return false;

  // Issues resolvidas ou ignoradas não são consideradas vencidas
  if (status === 'RESOLVED' || status === 'IGNORED') return false;

  const dueDate = new Date(slaDueAt);
  const now = new Date();

  // Compara apenas as datas (ignora horário)
  const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
  const todayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return dueDateOnly < todayOnly;
}

/**
 * Verifica se uma issue vence hoje
 */
export function isDueToday(slaDueAt: string | null | undefined, status: IssueStatus): boolean {
  if (!slaDueAt) return false;

  // Issues resolvidas ou ignoradas não são consideradas
  if (status === 'RESOLVED' || status === 'IGNORED') return false;

  const dueDate = new Date(slaDueAt);
  const now = new Date();

  return (
    dueDate.getFullYear() === now.getFullYear() &&
    dueDate.getMonth() === now.getMonth() &&
    dueDate.getDate() === now.getDate()
  );
}

/**
 * Calcula dias até o vencimento (positivo = dias restantes, negativo = dias vencidos)
 */
export function daysUntilDue(slaDueAt: string | null | undefined): number | null {
  if (!slaDueAt) return null;

  const dueDate = new Date(slaDueAt);
  const now = new Date();

  const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
  const todayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffTime = dueDateOnly.getTime() - todayOnly.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Retorna o status do SLA formatado para exibição
 */
export type SlaStatus = 'overdue' | 'due-today' | 'on-track' | 'no-sla';

export function getSlaStatus(slaDueAt: string | null | undefined, status: IssueStatus): SlaStatus {
  if (!slaDueAt) return 'no-sla';
  if (status === 'RESOLVED' || status === 'IGNORED') return 'on-track';
  if (isOverdue(slaDueAt, status)) return 'overdue';
  if (isDueToday(slaDueAt, status)) return 'due-today';
  return 'on-track';
}

/**
 * Formata data/hora para pt-BR
 */
export function formatDateTimePtBr(date: string | Date | null | undefined): string {
  if (!date) return '-';

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(dateObj);
  } catch {
    return '-';
  }
}

/**
 * Formata apenas data para pt-BR
 */
export function formatDatePtBr(date: string | Date | null | undefined): string {
  if (!date) return '-';

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(dateObj);
  } catch {
    return '-';
  }
}

/**
 * Formata data relativa (hoje, ontem, X dias atrás, etc.)
 */
export function formatRelativeDate(date: string | Date | null | undefined): string {
  if (!date) return '-';

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();

    const diffTime = now.getTime() - dateObj.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hoje';
    if (diffDays === 1) return 'Ontem';
    if (diffDays < 7) return `${diffDays} dias atrás`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} semanas atrás`;

    return formatDatePtBr(dateObj);
  } catch {
    return '-';
  }
}

/**
 * Gera texto descritivo para o badge de SLA
 */
export function getSlaLabel(slaDueAt: string | null | undefined, status: IssueStatus): string {
  const slaStatus = getSlaStatus(slaDueAt, status);

  switch (slaStatus) {
    case 'overdue': {
      const days = daysUntilDue(slaDueAt);
      if (days !== null && days < 0) {
        return `Vencido há ${Math.abs(days)} dia${Math.abs(days) !== 1 ? 's' : ''}`;
      }
      return 'Vencido';
    }
    case 'due-today':
      return 'Vence hoje';
    case 'on-track': {
      const days = daysUntilDue(slaDueAt);
      if (days !== null && days > 0) {
        return `${days} dia${days !== 1 ? 's' : ''} restante${days !== 1 ? 's' : ''}`;
      }
      return formatDatePtBr(slaDueAt);
    }
    case 'no-sla':
    default:
      return 'Sem SLA';
  }
}
