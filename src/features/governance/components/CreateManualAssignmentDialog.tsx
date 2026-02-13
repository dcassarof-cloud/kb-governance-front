import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Loader2 } from 'lucide-react';

import { governanceService, GovernanceAgentOption } from '@/services/governance.service';
import { governanceTexts } from '@/governanceTexts';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { formatApiErrorInfo, toApiErrorInfo } from '@/lib/api-error-info';

interface CreateManualAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => Promise<void> | void;
  prefilledAgentId?: string;
}

const REASONS = [
  { value: 'CONTENT_REVIEW', label: 'Revisão de conteúdo' },
  { value: 'SLA_RISK', label: 'Risco de SLA' },
  { value: 'MISSING_OWNER', label: 'Sem responsável definido' },
  { value: 'OTHER', label: 'Outro' },
];

const PRIORITIES = [
  { value: 'LOW', label: 'Baixa' },
  { value: 'MEDIUM', label: 'Média' },
  { value: 'HIGH', label: 'Alta' },
  { value: 'CRITICAL', label: 'Crítica' },
];

export function CreateManualAssignmentDialog({ open, onOpenChange, onCreated, prefilledAgentId }: CreateManualAssignmentDialogProps) {
  const [articleId, setArticleId] = useState('');
  const [agentId, setAgentId] = useState('');
  const [reason, setReason] = useState('');
  const [priority, setPriority] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');
  const [createTicket, setCreateTicket] = useState(true);

  const [agents, setAgents] = useState<GovernanceAgentOption[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ticketUrl, setTicketUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const loadAgents = async () => {
      setAgentsLoading(true);
      try {
        const result = await governanceService.listAgents();
        setAgents(result);
      } catch (err) {
        const info = toApiErrorInfo(err, 'Erro ao carregar agentes');
        toast({
          title: governanceTexts.general.errorTitle,
          description: formatApiErrorInfo(info),
          variant: 'destructive',
        });
      } finally {
        setAgentsLoading(false);
      }
    };

    void loadAgents();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setTicketUrl(null);
    if (prefilledAgentId) {
      setAgentId(prefilledAgentId);
    }
  }, [open, prefilledAgentId]);

  const selectedAgentName = useMemo(
    () => agents.find((agent) => agent.id === agentId)?.name ?? null,
    [agentId, agents],
  );

  const resetFields = () => {
    setArticleId('');
    setAgentId('');
    setReason('');
    setPriority('');
    setDueDate('');
    setDescription('');
    setCreateTicket(true);
    setTicketUrl(null);
  };

  const onSubmit = async () => {
    const parsedArticleId = Number(articleId);
    if (!Number.isInteger(parsedArticleId) || parsedArticleId <= 0) {
      toast({ title: governanceTexts.general.attentionTitle, description: 'Informe um ID de artigo inteiro e maior que zero.' });
      return;
    }

    if (!agentId.trim()) {
      toast({ title: governanceTexts.general.attentionTitle, description: 'Selecione um agente responsável.' });
      return;
    }

    if (!reason) {
      toast({ title: governanceTexts.general.attentionTitle, description: 'Selecione o motivo da solicitação.' });
      return;
    }

    if (!priority) {
      toast({ title: governanceTexts.general.attentionTitle, description: 'Selecione a prioridade.' });
      return;
    }

    setSaving(true);
    try {
      const result = await governanceService.createManualAssignment({
        articleId: parsedArticleId,
        agentId,
        reason,
        priority,
        dueDate: dueDate || undefined,
        description: description.trim() || undefined,
        createTicket,
      });

      setTicketUrl(result.ticketUrl ?? null);

      if (createTicket && result.ticketCreated === false) {
        toast({ title: governanceTexts.general.attentionTitle, description: 'Atribuição salva, ticket não criado.' });
      } else {
        toast({ title: governanceTexts.general.update, description: 'Atribuição criada.' });
      }

      if (onCreated) {
        await onCreated();
      }

      if (!result.ticketUrl) {
        onOpenChange(false);
        resetFields();
      }
    } catch (err) {
      const info = toApiErrorInfo(err, 'Falha ao criar atribuição manual');
      toast({ title: governanceTexts.general.errorTitle, description: formatApiErrorInfo(info), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova atribuição manual</DialogTitle>
          <DialogDescription>Solicite uma atribuição manual com opção de criação de ticket no Movidesk.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label>ID do artigo</Label>
            <Input value={articleId} onChange={(event) => setArticleId(event.target.value)} placeholder="Ex.: 12345" />
          </div>

          <div className="space-y-2">
            <Label>Agente</Label>
            <Select value={agentId} onValueChange={setAgentId}>
              <SelectTrigger>
                <SelectValue placeholder={agentsLoading ? 'Carregando agentes...' : 'Selecione um agente'} />
              </SelectTrigger>
              <SelectContent>
                {agents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Motivo</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {REASONS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((item) => (
                    <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Prazo (opcional)</Label>
            <Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Descrição (opcional)</Label>
            <Textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox id="create-ticket" checked={createTicket} onCheckedChange={(checked) => setCreateTicket(Boolean(checked))} />
            <Label htmlFor="create-ticket">Criar ticket Movidesk</Label>
          </div>

          {selectedAgentName && <p className="text-xs text-muted-foreground">Agente selecionado: {selectedAgentName}</p>}

          {ticketUrl && (
            <Button variant="outline" asChild>
              <a href={ticketUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Abrir ticket
              </a>
            </Button>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={onSubmit} disabled={saving || agentsLoading}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Criar atribuição
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
