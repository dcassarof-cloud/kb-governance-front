import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  change?: {
    value: number;
    label: string;
  };
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
  className?: string;
  children?: ReactNode;
}

const variantStyles = {
  default: 'bg-card',
  primary: 'bg-primary/5 border-primary/20',
  success: 'bg-success/5 border-success/20',
  warning: 'bg-warning/5 border-warning/20',
  error: 'bg-destructive/5 border-destructive/20',
};

const iconVariantStyles = {
  default: 'bg-muted text-muted-foreground',
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  error: 'bg-destructive/10 text-destructive',
};

export function MetricCard({
  title,
  value,
  icon: Icon,
  change,
  variant = 'default',
  className,
  children,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        'card-metric flex flex-col gap-4 animate-fade-in',
        variantStyles[variant],
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold tracking-tight">{value}</p>
        </div>
        <div className={cn('p-3 rounded-xl', iconVariantStyles[variant])}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
      
      {change && (
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'text-sm font-medium',
              change.value >= 0 ? 'text-success' : 'text-destructive'
            )}
          >
            {change.value >= 0 ? '+' : ''}
            {change.value}%
          </span>
          <span className="text-sm text-muted-foreground">{change.label}</span>
        </div>
      )}
      
      {children}
    </div>
  );
}
