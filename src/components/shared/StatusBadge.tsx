import { cn } from '@/lib/utils';
import { GovernanceStatus, SyncStatus, IssueStatus, IssueSeverity, SyncRunStatus } from '@/types';
import { governanceTexts } from '@/governanceTexts';

type BadgeVariant = 'ok' | 'warning' | 'error' | 'info' | 'muted';

interface StatusBadgeProps {
  status: GovernanceStatus | SyncStatus | IssueStatus | IssueSeverity | SyncRunStatus | string;
  className?: string;
  size?: 'sm' | 'md';
}

const statusMap: Record<string, { variant: BadgeVariant; label: string }> = {
  // Governance Status
  'OK': { variant: 'ok', label: governanceTexts.statusBadge.labels.OK },
  'WARNING': { variant: 'warning', label: governanceTexts.statusBadge.labels.WARNING },
  'PENDING': { variant: 'info', label: governanceTexts.statusBadge.labels.PENDING },
  
  // Sync Status
  'SYNCED': { variant: 'ok', label: governanceTexts.statusBadge.labels.SYNCED },
  'OUTDATED': { variant: 'warning', label: governanceTexts.statusBadge.labels.OUTDATED },
  'FAILED': { variant: 'error', label: governanceTexts.statusBadge.labels.FAILED },
  
  // Issue Status
  'OPEN': { variant: 'error', label: governanceTexts.statusBadge.labels.OPEN },
  'ASSIGNED': { variant: 'info', label: governanceTexts.statusBadge.labels.ASSIGNED },
  'IN_PROGRESS': { variant: 'warning', label: governanceTexts.statusBadge.labels.IN_PROGRESS },
  'RESOLVED': { variant: 'ok', label: governanceTexts.statusBadge.labels.RESOLVED },
  'IGNORED': { variant: 'muted', label: governanceTexts.statusBadge.labels.IGNORED },
  
  // Severity
  'INFO': { variant: 'info', label: governanceTexts.statusBadge.labels.INFO },
  'WARN': { variant: 'warning', label: governanceTexts.statusBadge.labels.WARN },
  'ERROR': { variant: 'error', label: governanceTexts.statusBadge.labels.ERROR },
  
  // Sync Run Status
  'RUNNING': { variant: 'info', label: governanceTexts.statusBadge.labels.RUNNING },
  'COMPLETED': { variant: 'ok', label: governanceTexts.statusBadge.labels.COMPLETED },
  'CANCELLED': { variant: 'muted', label: governanceTexts.statusBadge.labels.CANCELLED },
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
  const config = statusMap[status] || { variant: 'muted' as BadgeVariant, label: governanceTexts.general.notAvailable };
  
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
