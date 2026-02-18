import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { NeedStatusActionRequest } from '@/types/needs-enterprise';

type NeedActionType = 'start' | 'block' | 'complete' | 'cancel';

interface NeedActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionType: NeedActionType;
  needId?: number | null;
  onConfirm: (actionType: NeedActionType, needId: number, body: NeedStatusActionRequest) => Promise<void>;
  isLoading?: boolean;
}

const LABELS: Record<NeedActionType, string> = {
  start: 'Iniciar',
  block: 'Bloquear',
  complete: 'Concluir',
  cancel: 'Cancelar',
};

export const NeedActionDialog = ({
  open,
  onOpenChange,
  actionType,
  needId,
  onConfirm,
  isLoading = false,
}: NeedActionDialogProps) => {
  const [actorUserId, setActorUserId] = useState(1);
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (!open) {
      setComment('');
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!needId) return;

    await onConfirm(actionType, needId, {
      actorUserId,
      comment: comment.trim() || undefined,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{LABELS[actionType]} necessidade</DialogTitle>
          <DialogDescription>Informe o responsável pela ação e um comentário opcional para auditoria.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="action-actor">Actor User ID</Label>
            <Input id="action-actor" type="number" value={actorUserId} onChange={(event) => setActorUserId(Number(event.target.value))} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="action-comment">Comentário</Label>
            <Input id="action-comment" value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Opcional" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !needId}>
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
