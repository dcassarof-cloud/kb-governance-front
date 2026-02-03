// =====================================================
// ASSIGN RESPONSIBLE MODAL - Consisa KB Governance (Sprint 5)
// =====================================================

import { useState, useEffect } from 'react';
import { Loader2, UserPlus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { GovernanceIssue, GovernanceResponsible, ResponsibleType } from '@/types';
import { governanceService } from '@/services/governance.service';
import { toast } from '@/hooks/use-toast';

interface AssignResponsibleModalProps {
  issue: GovernanceIssue | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AssignResponsibleModal({ issue, open, onOpenChange, onSuccess }: AssignResponsibleModalProps) {
  const [responsibleType, setResponsibleType] = useState<ResponsibleType>('USER');
  const [responsibleId, setResponsibleId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Sugestão de responsável
  const [suggestedLoading, setSuggestedLoading] = useState(false);
  const [suggestedAssignee, setSuggestedAssignee] = useState<GovernanceResponsible | null>(null);
  const [suggestedAlternatives, setSuggestedAlternatives] = useState<GovernanceResponsible[]>([]);

  // Reset ao abrir/fechar
  useEffect(() => {
    if (open && issue) {
      setResponsibleId(issue.responsible || '');
      setResponsibleType(issue.responsibleType || 'USER');
      setDueDate('');
      fetchSuggestedAssignee();
    } else {
      setResponsibleId('');
      setResponsibleType('USER');
      setDueDate('');
      setSuggestedAssignee(null);
      setSuggestedAlternatives([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, issue]);

  const fetchSuggestedAssignee = async () => {
    if (!issue) return;
    setSuggestedLoading(true);
    try {
      const result = await governanceService.getSuggestedAssignee(issue.id);
      setSuggestedAssignee(result.suggested);
      setSuggestedAlternatives(result.alternatives || []);
    } catch {
      // Silenciar erro de sugestão
    } finally {
      setSuggestedLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!issue) return;

    const trimmedId = responsibleId.trim();
    if (!trimmedId) {
      toast({ title: 'Atenção', description: 'Informe o responsável.', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      await governanceService.assignIssue(issue.id, trimmedId, {
        responsibleType,
        responsibleId: trimmedId,
        dueDate: dueDate || undefined,
      });
      toast({ title: 'Sucesso', description: 'Responsável atribuído com sucesso.' });
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao atribuir responsável';
      toast({ title: 'Erro', description: message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const formatInputDate = (date: Date) => {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const selectSuggested = (responsible: GovernanceResponsible) => {
    setResponsibleId(responsible.name);
    if (responsible.id) {
      setResponsibleId(responsible.id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Atribuir Responsável
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Sugestão automática */}
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">Sugestão Automática</h4>
              {suggestedLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            </div>

            {suggestedLoading ? (
              <p className="text-sm text-muted-foreground">Buscando responsável recomendado...</p>
            ) : suggestedAssignee ? (
              <Button
                type="button"
                variant="outline"
                className="w-full justify-between"
                onClick={() => selectSuggested(suggestedAssignee)}
              >
                <span>{suggestedAssignee.name}</span>
                {typeof suggestedAssignee.pendingIssues === 'number' && (
                  <span className="text-xs text-muted-foreground">{suggestedAssignee.pendingIssues} pendências</span>
                )}
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma sugestão disponível</p>
            )}

            {suggestedAlternatives.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase">Alternativas</p>
                {suggestedAlternatives.slice(0, 3).map((alt, idx) => (
                  <button
                    key={`${alt.name}-${idx}`}
                    type="button"
                    className="w-full rounded-md border border-border px-3 py-2 text-left text-sm hover:bg-muted/50 transition"
                    onClick={() => selectSuggested(alt)}
                  >
                    <div className="flex items-center justify-between">
                      <span>{alt.name}</span>
                      {typeof alt.pendingIssues === 'number' && (
                        <span className="text-xs text-muted-foreground">{alt.pendingIssues} pendências</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Tipo de responsável */}
          <div className="space-y-2">
            <Label>Tipo de Responsável</Label>
            <Select value={responsibleType} onValueChange={(v) => setResponsibleType(v as ResponsibleType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USER">
                  <div className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    Usuário
                  </div>
                </SelectItem>
                <SelectItem value="TEAM">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Equipe
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* ID do responsável */}
          <div className="space-y-2">
            <Label>{responsibleType === 'USER' ? 'Nome/ID do Usuário' : 'Nome/ID da Equipe'}</Label>
            <Input
              placeholder={responsibleType === 'USER' ? 'Ex: joao.silva' : 'Ex: equipe-suporte'}
              value={responsibleId}
              onChange={(e) => setResponsibleId(e.target.value)}
            />
          </div>

          {/* Prazo */}
          <div className="space-y-2">
            <Label>Prazo (opcional)</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setDueDate(formatInputDate(new Date()))}
              >
                Hoje
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  const date = new Date();
                  date.setDate(date.getDate() + 3);
                  setDueDate(formatInputDate(date));
                }}
              >
                +3 dias
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  const date = new Date();
                  date.setDate(date.getDate() + 7);
                  setDueDate(formatInputDate(date));
                }}
              >
                +7 dias
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
