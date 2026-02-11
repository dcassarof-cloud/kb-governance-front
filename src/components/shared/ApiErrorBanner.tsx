import { AlertTriangle } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface ApiErrorBannerProps {
  title: string;
  description: string;
  onRetry?: () => void;
}

export function ApiErrorBanner({ title, description, onRetry }: ApiErrorBannerProps) {
  return (
    <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />
        <div className="flex-1 space-y-1">
          <p className="font-medium text-destructive">{title}</p>
          <p className="text-muted-foreground">{description}</p>
        </div>
        {onRetry && (
          <Button size="sm" variant="outline" onClick={onRetry}>
            Recarregar
          </Button>
        )}
      </div>
    </div>
  );
}
