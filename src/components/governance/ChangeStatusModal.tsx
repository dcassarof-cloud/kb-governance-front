// =====================================================
// CHANGE STATUS MODAL - Consisa KB Governance (Sprint 5)
// =====================================================

import { useState, useEffect } from 'react';
import { Loader2, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { GovernanceIssue, IssueStatus } from '@/types';
import { governanceService } from '@/services/governance.service';
import { toast } from '@/hooks/use-toast';

interface ChangeStatusModalProps {
  issue: GovernanceIssue | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const STATUS_OPTIONS: { value: IssueStatus; label: string; description: string }[] = [
  { value: 'OPEN', label: 'Aberta', description: 'Issue aguardando análise' },
  { value: 'IN_PROGRESS', label: 'Em Progresso', description: 'Issue está sendo tratada' },
  { value: 'RESOLVED', label: 'Resolvida', description: 'Issue foi corrigida' },
  { value: 'IGNORED', label: 'Ignorada', description: 'Issue não será tratada (requer motivo)' },
];

export function ChangeStatusModal({ issue, open, onOpenChange, onSuccess }: ChangeStatusModalProps) {
  const [status, setStatus] = useState<IssueStatus>('OPEN');
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Reset ao abrir/fechar
  useEffect(() => {
    if (open && issue) {
      setStatus(issue.status || 'OPEN');
      setReason('');
    } else {
      setStatus('OPEN');
      setReason('');
    }
  }, [open, issue]);

  const handleSubmit = async () => {
    if (!issue) return;

    // Validação: motivo obrigatório para IGNORED
    if (status === 'IGNORED' && !reason.trim()) {
      toast({ title: 'Atenção', description: 'Informe o motivo para ignorar a issue.', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      await governanceService.changeStatus(issue.id, status, status === 'IGNORED' ? reason.trim() : undefined);
      toast({ title: 'Sucesso', description: 'Status atualizado com sucesso.' });
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar status';
      toast({ title: 'Erro', description: message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const selectedOption = STATUS_OPTIONS.find((opt) => opt.value === status);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCcw className="h-5 w-5" />
            Alterar Status
          </DialogTitle>
          {issue && (
            <DialogDescription>
              {issue.typeDisplayName || issue.type} - {issue.articleTitle || issue.title || 'Issue'}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4">
          {/* Status atual */}
          {issue && (
            <div className="rounded-md bg-muted/30 p-3 text-sm">
              <span className="text-muted-foreground">Status atual: </span>
              <span className="font-medium">{issue.status}</span>
            </div>
          )}

          {/* Novo status */}
          <div className="space-y-2">
            <Label>Novo Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as IssueStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div>
                      <div className="font-medium">{opt.label}</div>
                      <div className="text-xs text-muted-foreground">{opt.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedOption && (
              <p className="text-xs text-muted-foreground">{selectedOption.description}</p>
            )}
          </div>

          {/* Motivo (obrigatório para IGNORED) */}
          {status === 'IGNORED' && (
            <div className="space-y-2">
              <Label>
                Motivo <span className="text-destructive">*</span>
              </Label>
              <Textarea
                placeholder="Descreva o motivo para ignorar esta issue..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                O motivo é obrigatório para issues ignoradas e será registrado no histórico.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || (status === 'IGNORED' && !reason.trim())}
            variant={status === 'IGNORED' ? 'destructive' : 'default'}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : status === 'IGNORED' ? (
              'Ignorar Issue'
            ) : (
              'Salvar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
