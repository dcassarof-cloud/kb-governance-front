// =====================================================
// SLA BADGE - Consisa KB Governance (Sprint 5)
// =====================================================

import { Badge } from '@/components/ui/badge';
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { IssueStatus } from '@/types';
import { getSlaStatus, getSlaLabel, type SlaStatus } from '@/lib/sla-utils';
import { cn } from '@/lib/utils';

interface SlaBadgeProps {
  slaDueAt: string | null | undefined;
  status: IssueStatus;
  showIcon?: boolean;
  className?: string;
}

const slaStyles: Record<SlaStatus, { variant: 'destructive' | 'warning' | 'secondary' | 'outline'; className: string }> = {
  overdue: {
    variant: 'destructive',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800',
  },
  'due-today': {
    variant: 'warning',
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  },
  'on-track': {
    variant: 'secondary',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
  },
  'no-sla': {
    variant: 'outline',
    className: 'text-muted-foreground',
  },
};

const slaIcons: Record<SlaStatus, typeof Clock> = {
  overdue: AlertTriangle,
  'due-today': Clock,
  'on-track': CheckCircle,
  'no-sla': Clock,
};

export function SlaBadge({ slaDueAt, status, showIcon = true, className }: SlaBadgeProps) {
  const slaStatus = getSlaStatus(slaDueAt, status);
  const label = getSlaLabel(slaDueAt, status);
  const style = slaStyles[slaStatus];
  const Icon = slaIcons[slaStatus];

  return (
    <Badge variant={style.variant} className={cn(style.className, className)}>
      {showIcon && <Icon className="h-3 w-3 mr-1" />}
      {label}
    </Badge>
  );
}
