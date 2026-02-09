import { Loader2 } from 'lucide-react';

interface LoadingProps {
  label?: string;
  className?: string;
}

export function Loading({ label = 'Carregando...', className = '' }: LoadingProps) {
  return (
    <div className={`flex items-center justify-center gap-2 text-muted-foreground ${className}`}>
      <Loader2 className="h-4 w-4 animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  );
}
