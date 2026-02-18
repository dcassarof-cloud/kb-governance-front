import { useState } from 'react';

import { EmptyState } from '@/components/shared/EmptyState';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useNeedDetail, useNeedLegacyActions } from '@/hooks/useNeedsEnterprise';

interface NeedDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  needId?: number | null;
}

type LegacyActionType = 'task' | 'ticket';

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleString('pt-BR');
};

export const NeedDetailDialog = ({ open, onOpenChange, needId }: NeedDetailDialogProps) => {
  const detailQuery = useNeedDetail(needId, open);
  const { createTaskMutation, createTicketMutation } = useNeedLegacyActions();
  const [confirmAction, setConfirmAction] = useState<LegacyActionType | null>(null);

  const isActionLoading = createTaskMutation.isPending || createTicketMutation.isPending;

  const handleConfirmAction = async () => {
    if (!needId || !confirmAction) return;

    if (confirmAction === 'task') {
      await createTaskMutation.mutateAsync(needId);
      setConfirmAction(null);
      return;
    }

    await createTicketMutation.mutateAsync(needId);
    setConfirmAction(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da necessidade</DialogTitle>
            <DialogDescription>
              Visualize os dados da necessidade e execute ações legadas de criação de task e master ticket.
            </DialogDescription>
          </DialogHeader>

          {detailQuery.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : detailQuery.isError ? (
            <EmptyState
              title="Falha ao carregar detalhes da necessidade."
              description="Não foi possível buscar os dados detalhados."
              action={{ label: 'Tentar novamente', onClick: () => detailQuery.refetch() }}
              className="py-4"
            />
          ) : !detailQuery.data ? (
            <EmptyState title="Detalhe indisponível" description="Nenhum dado retornado para esta necessidade." className="py-4" />
          ) : (
            <div className="space-y-4 text-sm">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <p className="text-muted-foreground">Sistema</p>
                  <p>{detailQuery.data.systemName || detailQuery.data.systemCode || '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <p>{detailQuery.data.status || '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Severidade</p>
                  <p>{detailQuery.data.severity || '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Criado em</p>
                  <p>{formatDate(detailQuery.data.createdAt)}</p>
                </div>
              </div>

              <div>
                <p className="text-muted-foreground">Motivo / Descrição</p>
                <p>{detailQuery.data.description || detailQuery.data.reason || '—'}</p>
              </div>

              <div className="space-y-2">
                <p className="font-medium">Exemplos</p>
                {detailQuery.data.examples?.length ? (
                  <ul className="space-y-2">
                    {detailQuery.data.examples.map((example, index) => (
                      <li key={`${example.id ?? 'example'}-${index}`} className="rounded-md border p-3">
                        <p className="font-medium">{example.title || 'Sem título'}</p>
                        <p className="text-muted-foreground">Sistema: {example.systemCode || '—'}</p>
                        {example.url ? (
                          <a className="text-primary underline" href={example.url} target="_blank" rel="noreferrer">
                            Abrir ticket
                          </a>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">Nenhum exemplo disponível.</p>
                )}
              </div>

              {detailQuery.data.ticketUrl || detailQuery.data.link ? (
                <a
                  className="text-primary underline"
                  href={detailQuery.data.ticketUrl || detailQuery.data.link || '#'}
                  target="_blank"
                  rel="noreferrer"
                >
                  Abrir ticket
                </a>
              ) : null}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
            <Button variant="secondary" disabled={!needId || isActionLoading} onClick={() => setConfirmAction('task')}>
              Criar task
            </Button>
            <Button disabled={!needId || isActionLoading} onClick={() => setConfirmAction('ticket')}>
              Criar master ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(confirmAction)} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar ação</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === 'task'
                ? 'Deseja criar uma task interna para esta necessidade?'
                : 'Deseja criar um master ticket para esta necessidade?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isActionLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={isActionLoading} onClick={handleConfirmAction}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
