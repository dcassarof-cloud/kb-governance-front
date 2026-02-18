import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { NeedSeverity, NeedSource, NeedTriageRequest } from '@/types/needs-enterprise';

interface NeedTriageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  needId?: number | null;
  onConfirm: (needId: number, body: NeedTriageRequest) => Promise<void>;
  isLoading?: boolean;
}

export const NeedTriageDialog = ({ open, onOpenChange, needId, onConfirm, isLoading = false }: NeedTriageDialogProps) => {
  const [actorUserId, setActorUserId] = useState(1);
  const [severity, setSeverity] = useState<NeedSeverity>('MEDIUM');
  const [source, setSource] = useState<NeedSource>('MANUAL_REQUEST');
  const [dueAt, setDueAt] = useState('');
  const [assigneeUserIdsInput, setAssigneeUserIdsInput] = useState('1,2');

  const handleSubmit = async () => {
    if (!needId) return;

    // Parse explícito do campo textual "1,2,3" para número[], ignorando entradas vazias.
    const assigneeUserIds = assigneeUserIdsInput
      .split(',')
      .map((item) => Number(item.trim()))
      .filter((value) => Number.isInteger(value) && value > 0);

    const payload: NeedTriageRequest = {
      actorUserId,
      severity,
      source,
      dueAt: dueAt || undefined,
      assigneeUserIds: assigneeUserIds.length ? assigneeUserIds : undefined,
    };

    await onConfirm(needId, payload);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Triar necessidade</DialogTitle>
          <DialogDescription>Defina severidade, origem, prazo e responsáveis.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="triage-actor">Actor User ID</Label>
            <Input id="triage-actor" type="number" value={actorUserId} onChange={(event) => setActorUserId(Number(event.target.value))} />
          </div>

          <div className="space-y-2">
            <Label>Severidade</Label>
            <Select value={severity} onValueChange={(value) => setSeverity(value as NeedSeverity)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LOW">LOW</SelectItem>
                <SelectItem value="MEDIUM">MEDIUM</SelectItem>
                <SelectItem value="HIGH">HIGH</SelectItem>
                <SelectItem value="CRITICAL">CRITICAL</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Origem</Label>
            <Select value={source} onValueChange={(value) => setSource(value as NeedSource)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GOVERNANCE_ISSUE">GOVERNANCE_ISSUE</SelectItem>
                <SelectItem value="MANUAL_REQUEST">MANUAL_REQUEST</SelectItem>
                <SelectItem value="TICKET_PATTERN">TICKET_PATTERN</SelectItem>
                <SelectItem value="AI_DETECTION">AI_DETECTION</SelectItem>
                <SelectItem value="ADMIN_CREATION">ADMIN_CREATION</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="triage-due-at">Prazo</Label>
            <Input id="triage-due-at" type="date" value={dueAt} onChange={(event) => setDueAt(event.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="triage-assignees">Responsáveis</Label>
            <Input
              id="triage-assignees"
              placeholder="1,2,3"
              value={assigneeUserIdsInput}
              onChange={(event) => setAssigneeUserIdsInput(event.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !needId}>
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
