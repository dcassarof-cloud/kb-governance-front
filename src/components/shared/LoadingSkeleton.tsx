import { cn } from '@/lib/utils';

interface LoadingSkeletonProps {
  className?: string;
  variant?: 'text' | 'card' | 'table' | 'chart';
  rows?: number;
}

export function LoadingSkeleton({ className, variant = 'text', rows = 3 }: LoadingSkeletonProps) {
  if (variant === 'card') {
    return (
      <div className={cn('card-metric animate-pulse', className)}>
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-muted rounded w-24" />
            <div className="h-8 bg-muted rounded w-32" />
          </div>
          <div className="h-12 w-12 bg-muted rounded-xl" />
        </div>
        <div className="h-4 bg-muted rounded w-40 mt-4" />
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div className={cn('table-container animate-pulse', className)}>
        <div className="p-4 border-b border-border">
          <div className="flex gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-4 bg-muted rounded flex-1" />
            ))}
          </div>
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-4 border-b border-border last:border-0">
            <div className="flex gap-4">
              {[1, 2, 3, 4, 5].map((j) => (
                <div key={j} className="h-4 bg-muted rounded flex-1" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'chart') {
    return (
      <div className={cn('card-metric animate-pulse', className)}>
        <div className="h-4 bg-muted rounded w-32 mb-4" />
        <div className="h-64 bg-muted rounded" />
      </div>
    );
  }

  return (
    <div className={cn('space-y-3 animate-pulse', className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-muted rounded"
          style={{ width: `${Math.random() * 40 + 60}%` }}
        />
      ))}
    </div>
  );
}
