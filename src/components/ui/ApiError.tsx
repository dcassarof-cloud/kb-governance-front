import { AlertCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface ApiErrorProps {
  title: string;
  description?: string | null;
  actionLabel?: string;
  onAction?: () => void;
}

export function ApiError({ title, description, actionLabel = 'Tentar novamente', onAction }: ApiErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <AlertCircle className="h-12 w-12 text-destructive mb-4" />
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      {description && <p className="text-sm text-muted-foreground mb-4">{description}</p>}
      {onAction && (
        <Button onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
