import { cn } from '@/lib/utils';
import { GovernanceStatus, SyncStatus, IssueStatus, IssueSeverity, SyncRunStatus } from '@/types';

type BadgeVariant = 'ok' | 'warning' | 'error' | 'info' | 'muted';

interface StatusBadgeProps {
  status: GovernanceStatus | SyncStatus | IssueStatus | IssueSeverity | SyncRunStatus | string;
  className?: string;
  size?: 'sm' | 'md';
}

const statusMap: Record<string, { variant: BadgeVariant; label: string }> = {
  // Governance Status
  'OK': { variant: 'ok', label: 'OK' },
  'WARNING': { variant: 'warning', label: 'Atenção' },
  'ERROR': { variant: 'error', label: 'Erro' },
  'PENDING': { variant: 'info', label: 'Pendente' },
  
  // Sync Status
  'SYNCED': { variant: 'ok', label: 'Sincronizado' },
  'OUTDATED': { variant: 'warning', label: 'Desatualizado' },
  'FAILED': { variant: 'error', label: 'Falhou' },
  
  // Issue Status
  'OPEN': { variant: 'error', label: 'Aberto' },
  'ASSIGNED': { variant: 'info', label: 'Atribuído' },
  'IN_PROGRESS': { variant: 'warning', label: 'Em Progresso' },
  'RESOLVED': { variant: 'ok', label: 'Resolvido' },
  'IGNORED': { variant: 'muted', label: 'Ignorado' },
  
  // Severity
  'LOW': { variant: 'info', label: 'Baixa' },
  'MEDIUM': { variant: 'warning', label: 'Média' },
  'HIGH': { variant: 'error', label: 'Alta' },
  'CRITICAL': { variant: 'error', label: 'Crítica' },
  
  // Sync Run Status
  'RUNNING': { variant: 'info', label: 'Executando' },
  'COMPLETED': { variant: 'ok', label: 'Concluído' },
  'CANCELLED': { variant: 'muted', label: 'Cancelado' },
};

const variantClasses: Record<BadgeVariant, string> = {
  ok: 'status-ok',
  warning: 'status-warning',
  error: 'status-error',
  info: 'status-info',
  muted: 'bg-muted text-muted-foreground border-muted',
};

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
};

export function StatusBadge({ status, className, size = 'sm' }: StatusBadgeProps) {
  const config = statusMap[status] || { variant: 'muted' as BadgeVariant, label: status };
  
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full border',
        variantClasses[config.variant],
        sizeClasses[size],
        className
      )}
    >
      <span className={cn(
        'w-1.5 h-1.5 rounded-full mr-1.5',
        config.variant === 'ok' && 'bg-success',
        config.variant === 'warning' && 'bg-warning',
        config.variant === 'error' && 'bg-destructive',
        config.variant === 'info' && 'bg-primary',
        config.variant === 'muted' && 'bg-muted-foreground',
      )} />
      {config.label}
    </span>
  );
}
