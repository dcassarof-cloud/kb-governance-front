import { useEffect, useMemo, useRef } from 'react';

import { API_ENDPOINTS } from '@/config/app-config';
import { NeedsEmptyState } from '@/components/needs/NeedsEmptyState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useNeedDetail, useNeedHistory } from '@/hooks/useNeedsEnterprise';
import { toApiErrorInfo } from '@/lib/api-error-info';

interface NeedDetailsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  needId?: number | null;
}

const formatDateTime = (value?: string | null) => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleString('pt-BR');
};

export const NeedDetailsDrawer = ({ open, onOpenChange, needId }: NeedDetailsDrawerProps) => {
  const detailQuery = useNeedDetail(needId, open);
  const historyQuery = useNeedHistory(needId, open);
  const loggedErrorsRef = useRef({ detail: false, history: false });

  const detailErrorInfo = detailQuery.isError ? toApiErrorInfo(detailQuery.error, 'Falha ao carregar detalhes.') : null;
  const historyErrorInfo = historyQuery.isError ? toApiErrorInfo(historyQuery.error, 'Falha ao carregar histórico.') : null;

  useEffect(() => {
    loggedErrorsRef.current = { detail: false, history: false };
  }, [needId, open]);

  useEffect(() => {
    if (!needId || !detailErrorInfo || loggedErrorsRef.current.detail) return;
    console.error('[needs] detail_failed', {
      id: needId,
      url: API_ENDPOINTS.NEEDS_BY_ID(needId),
      statusCode: detailErrorInfo.status,
      correlationId: detailErrorInfo.correlationId,
    });
    loggedErrorsRef.current.detail = true;
  }, [detailErrorInfo, needId]);

  useEffect(() => {
    if (!needId || !historyErrorInfo || loggedErrorsRef.current.history) return;
    console.error('[needs] history_failed', {
      id: needId,
      url: API_ENDPOINTS.NEEDS_HISTORY(needId),
      statusCode: historyErrorInfo.status,
      correlationId: historyErrorInfo.correlationId,
    });
    loggedErrorsRef.current.history = true;
  }, [historyErrorInfo, needId]);

  const fallbackTitle = detailErrorInfo ? 'Falha ao carregar detalhes' : 'Falha ao carregar histórico';
  const fallbackDescription = [
    detailErrorInfo
      ? `Detalhes • statusCode: ${detailErrorInfo.status ?? '—'} • correlationId: ${detailErrorInfo.correlationId ?? '—'}`
      : null,
    historyErrorInfo
      ? `Histórico • statusCode: ${historyErrorInfo.status ?? '—'} • correlationId: ${historyErrorInfo.correlationId ?? '—'}`
      : null,
  ]
    .filter(Boolean)
    .join('\n');

  const hasDetailData = useMemo(() => {
    const detail = detailQuery.data;
    if (!detail) return false;
    return Boolean(
      detail.subject ||
      detail.summary ||
      detail.category ||
      detail.teamName ||
      detail.relatedSystems?.length ||
      detail.examples?.length,
    );
  }, [detailQuery.data]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Detalhes da necessidade</DialogTitle>
          <DialogDescription>Visão completa com contexto, exemplos de tickets e histórico.</DialogDescription>
        </DialogHeader>

        {detailQuery.isLoading || historyQuery.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : detailQuery.isError || historyQuery.isError ? (
          <NeedsEmptyState
            title={fallbackTitle}
            description={fallbackDescription}
            onReload={() => {
              void detailQuery.refetch();
              void historyQuery.refetch();
            }}
          />
        ) : !detailQuery.data ? (
          <NeedsEmptyState
            title="Detalhes indisponíveis"
            description="Nenhum dado retornado para esta necessidade."
            onReload={() => void detailQuery.refetch()}
          />
        ) : (
          <div className="space-y-4 text-sm">
            <div>
              <p className="text-xl font-semibold">{detailQuery.data.subject || detailQuery.data.summary || 'Sem título'}</p>
              <p className="text-muted-foreground">{detailQuery.data.category || 'Categoria não informada'}</p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className="text-muted-foreground">Equipe predominante</p>
                <p>{detailQuery.data.teamName || '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Sistemas relacionados</p>
                <div className="flex flex-wrap gap-2">
                  {(detailQuery.data.relatedSystems ?? []).map((system) => (
                    <Badge key={system} variant="secondary">{system}</Badge>
                  ))}
                  {!detailQuery.data.relatedSystems?.length ? <span>—</span> : null}
                </div>
              </div>
            </div>

            <div>
              <p className="text-muted-foreground">Resumo / Contexto</p>
              <p>{detailQuery.data.description || detailQuery.data.reason || detailQuery.data.summary || '—'}</p>
            </div>

            <div>
              <p className="mb-2 font-medium">Tickets exemplo</p>
              {detailQuery.data.examples?.length ? (
                <ul className="space-y-2">
                  {detailQuery.data.examples.map((example, index) => (
                    <li key={`${example.id ?? 'ticket'}-${index}`} className="rounded border p-3">
                      <p><strong>ID:</strong> {example.id || '—'}</p>
                      <p><strong>Assunto:</strong> {example.subject || example.title || '—'}</p>
                      <p><strong>Data:</strong> {formatDateTime(example.createdAt)}</p>
                      <p><strong>Status final:</strong> {example.finalStatus || example.status || '—'}</p>
                      <p><strong>Último responsável:</strong> {example.finishedBy || '—'} {example.finishedByTeam ? `(${example.finishedByTeam})` : ''}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">Nenhum ticket exemplo retornado.</p>
              )}
            </div>

            <div>
              <p className="mb-2 font-medium">Histórico</p>
              {!historyQuery.data?.length ? (
                <p className="text-muted-foreground">Nenhum evento de histórico retornado.</p>
              ) : (
                <ul className="space-y-2">
                  {historyQuery.data.map((item, idx) => (
                    <li key={`${item.changedAt}-${idx}`} className="rounded border p-3">
                      <p>{(item.oldStatus || 'CRIADO').toUpperCase()} → {item.newStatus.toUpperCase()}</p>
                      <p className="text-muted-foreground">{formatDateTime(item.changedAt)}</p>
                      {item.comment ? <p>{item.comment}</p> : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {!hasDetailData ? (
              <NeedsEmptyState
                title="Dados insuficientes no backend para detalhamento"
                description="O payload retornou sem categoria/equipe/tickets suficientes para montar o detalhamento completo."
                onReload={() => {
                  void detailQuery.refetch();
                  void historyQuery.refetch();
                }}
              />
            ) : null}

            {detailQuery.data.externalTicketId ? (
              <Button asChild>
                <a href={`https://atendimento.movidesk.com/Ticket/Edit/${detailQuery.data.externalTicketId}`} target="_blank" rel="noreferrer">
                  Abrir Ticket no Movidesk
                </a>
              </Button>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
