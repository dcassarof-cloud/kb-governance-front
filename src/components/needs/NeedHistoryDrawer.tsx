import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useNeedHistory } from '@/hooks/useNeedsEnterprise';

interface NeedHistoryDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  needId?: number | null;
}

const formatDateTime = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleString('pt-BR');
};

export const NeedHistoryDrawer = ({ open, onOpenChange, needId }: NeedHistoryDrawerProps) => {
  const historyQuery = useNeedHistory(needId, open);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Histórico da necessidade</DialogTitle>
          <DialogDescription>Visualize mudanças de status, responsável e comentários registrados.</DialogDescription>
        </DialogHeader>

        {historyQuery.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : historyQuery.isError ? (
          <div className="rounded-md border border-destructive/40 p-4 text-sm text-destructive">
            Falha ao carregar histórico.
          </div>
        ) : !historyQuery.data?.length ? (
          <div className="rounded-md border p-4 text-sm text-muted-foreground">Nenhuma transição registrada.</div>
        ) : (
          <ul className="space-y-2">
            {historyQuery.data.map((item, index) => (
              <li key={`${item.changedAt}-${index}`} className="rounded-md border p-3 text-sm">
                <p className="font-medium">
                  {(item.oldStatus || '—').toUpperCase()} → {item.newStatus.toUpperCase()}
                </p>
                <p className="text-muted-foreground">{formatDateTime(item.changedAt)}</p>
                <p className="text-muted-foreground">Usuário: {item.changedByUserId}</p>
                {item.comment ? <p className="mt-2">Comentário: {item.comment}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
};
