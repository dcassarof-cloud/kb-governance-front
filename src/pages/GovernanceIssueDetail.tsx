// =====================================================
// GOVERNANCE ISSUE DETAIL PAGE - Consisa KB Governance (Sprint 5)
// =====================================================

import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  UserPlus,
  RefreshCcw,
  ExternalLink,
  Lightbulb,
  Info,
  Calendar,
  Clock,
  User,
  FileText,
  Loader2,
} from 'lucide-react';

import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

import {
  SlaBadge,
  IssueTimeline,
  AssignResponsibleModal,
  ChangeStatusModal,
  ISSUE_TYPE_LABELS,
} from '@/components/governance';

import { governanceService } from '@/services/governance.service';
import { GovernanceIssueDetail, IssueHistoryEntry } from '@/types';
import { toast } from '@/hooks/use-toast';
import { formatDateTimePtBr, formatDatePtBr } from '@/lib/sla-utils';

export default function GovernanceIssueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Issue detail state
  const [issue, setIssue] = useState<GovernanceIssueDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // History state
  const [history, setHistory] = useState<IssueHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // Modals state
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);

  // Fetch issue details
  const fetchIssue = useCallback(async () => {
    if (!id) return;

    setIsLoading(true);
    setError(null);
    try {
      const result = await governanceService.getIssueDetails(id);
      setIssue(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar detalhes da issue';
      console.error('Erro ao carregar issue:', err);
      setError(message);
      toast({ title: 'Erro', description: message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  // Fetch history
  const fetchHistory = useCallback(async () => {
    if (!id) return;

    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const result = await governanceService.getHistory(id);
      setHistory(Array.isArray(result) ? result : []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar histórico';
      console.error('Erro ao carregar histórico:', err);
      setHistoryError(message);
    } finally {
      setHistoryLoading(false);
    }
  }, [id]);

  // Initial load
  useEffect(() => {
    fetchIssue();
    fetchHistory();
  }, [fetchIssue, fetchHistory]);

  // Handle modal success
  const handleModalSuccess = () => {
    fetchIssue();
    fetchHistory();
  };

  // Loading state
  if (isLoading) {
    return (
      <MainLayout>
        <div className="mb-4">
          <Button variant="ghost" asChild>
            <Link to="/governance">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para Governança
            </Link>
          </Button>
        </div>
        <LoadingSkeleton variant="card" />
        <div className="mt-4">
          <LoadingSkeleton variant="table" rows={3} />
        </div>
      </MainLayout>
    );
  }

  // Error state
  if (error || !issue) {
    return (
      <MainLayout>
        <div className="mb-4">
          <Button variant="ghost" asChild>
            <Link to="/governance">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para Governança
            </Link>
          </Button>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertCircle className="h-16 w-16 text-destructive mb-4" />
          <h2 className="text-xl font-semibold mb-2">Erro ao carregar issue</h2>
          <p className="text-muted-foreground mb-4">{error || 'Issue não encontrada'}</p>
          <div className="flex gap-2">
            <Button onClick={fetchIssue}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar novamente
            </Button>
            <Button variant="outline" onClick={() => navigate('/governance')}>
              Voltar
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  const typeLabel = ISSUE_TYPE_LABELS[issue.type] || issue.typeDisplayName || issue.type;
  const slaDueAt = issue.slaDueAt || issue.dueDate;

  return (
    <MainLayout>
      {/* Breadcrumb / Back */}
      <div className="mb-4">
        <Button variant="ghost" asChild>
          <Link to="/governance">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Governança
          </Link>
        </Button>
      </div>

      {/* Header com badges */}
      <div className="mb-6">
        <div className="flex flex-wrap items-start gap-4 mb-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold mb-2">{typeLabel}</h1>
            <p className="text-muted-foreground">{issue.articleTitle || issue.title || 'Issue de governança'}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={issue.status || 'OPEN'} />
            <StatusBadge status={issue.severity || 'LOW'} />
            <SlaBadge slaDueAt={slaDueAt} status={issue.status || 'OPEN'} />
          </div>
        </div>

        {/* Ações principais */}
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setAssignModalOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Atribuir Responsável
          </Button>
          <Button variant="outline" onClick={() => setStatusModalOpen(true)}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Mudar Status
          </Button>
          {issue.manualLink && (
            <Button variant="outline" asChild>
              <a href={issue.manualLink} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Abrir Artigo
              </a>
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* O que é isso? */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-blue-500" />
                O que é isso?
              </CardTitle>
              <CardDescription>Entenda o problema identificado</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">
                {issue.description || issue.details || issue.message || 'Descrição não disponível para este tipo de issue.'}
              </p>
            </CardContent>
          </Card>

          {/* Como resolver */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-amber-500" />
                Como resolver
              </CardTitle>
              <CardDescription>Recomendações para tratar esta issue</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">
                {issue.recommendation || getDefaultRecommendation(issue.type)}
              </p>
            </CardContent>
          </Card>

          {/* Timeline de histórico */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-purple-500" />
                Histórico de Alterações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <IssueTimeline
                history={history}
                isLoading={historyLoading}
                error={historyError}
              />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar com informações */}
        <div className="space-y-6">
          {/* Dados da issue */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Informações
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Sistema */}
              <div>
                <p className="text-sm text-muted-foreground mb-1">Sistema</p>
                <p className="font-medium">{issue.systemName || issue.systemCode || '-'}</p>
              </div>

              <Separator />

              {/* Responsável */}
              <div>
                <p className="text-sm text-muted-foreground mb-1">Responsável</p>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className={!issue.responsible ? 'text-amber-600 font-medium' : ''}>
                    {issue.responsible || 'Não atribuído'}
                  </span>
                </div>
                {issue.responsibleType && (
                  <Badge variant="outline" className="mt-1 text-xs">
                    {issue.responsibleType === 'USER' ? 'Usuário' : 'Equipe'}
                  </Badge>
                )}
              </div>

              <Separator />

              {/* Datas */}
              <div>
                <p className="text-sm text-muted-foreground mb-1">Criada em</p>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{formatDateTimePtBr(issue.createdAt)}</span>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">SLA (Prazo)</p>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{formatDatePtBr(slaDueAt) || 'Sem prazo definido'}</span>
                </div>
              </div>

              {issue.resolvedAt && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Resolvida em</p>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-green-500" />
                    <span>{formatDateTimePtBr(issue.resolvedAt)}</span>
                  </div>
                </div>
              )}

              {issue.ignoredAt && issue.status === 'IGNORED' && (
                <>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Ignorada em</p>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span>{formatDateTimePtBr(issue.ignoredAt)}</span>
                    </div>
                  </div>
                  {issue.ignoredReason && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Motivo</p>
                      <p className="text-sm italic bg-muted/30 p-2 rounded">{issue.ignoredReason}</p>
                    </div>
                  )}
                </>
              )}

              <Separator />

              {/* Link do artigo */}
              {issue.manualLink && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Artigo/Manual</p>
                  <a
                    href={issue.manualLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Abrir artigo original
                  </a>
                </div>
              )}

              {/* ID técnico */}
              <div>
                <p className="text-sm text-muted-foreground mb-1">ID</p>
                <code className="text-xs bg-muted px-2 py-1 rounded">{issue.id}</code>
              </div>
            </CardContent>
          </Card>

          {/* Ações rápidas */}
          <Card>
            <CardHeader>
              <CardTitle>Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full" onClick={() => setAssignModalOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Atribuir Responsável
              </Button>
              <Button variant="outline" className="w-full" onClick={() => setStatusModalOpen(true)}>
                <RefreshCcw className="h-4 w-4 mr-2" />
                Mudar Status
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => {
                  fetchIssue();
                  fetchHistory();
                }}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modais */}
      <AssignResponsibleModal
        issue={issue}
        open={assignModalOpen}
        onOpenChange={setAssignModalOpen}
        onSuccess={handleModalSuccess}
      />

      <ChangeStatusModal
        issue={issue}
        open={statusModalOpen}
        onOpenChange={setStatusModalOpen}
        onSuccess={handleModalSuccess}
      />
    </MainLayout>
  );
}

// Helper para recomendações padrão por tipo
function getDefaultRecommendation(type: string): string {
  const recommendations: Record<string, string> = {
    REVIEW_REQUIRED:
      'Este artigo precisa ser revisado por um especialista. Verifique se o conteúdo está atualizado, correto e alinhado com as práticas atuais da empresa. Após a revisão, atualize o artigo e marque a issue como resolvida.',
    NOT_AI_READY:
      'O conteúdo deste artigo não está adequado para uso por assistentes de IA. Revise o texto para garantir clareza, precisão e estruturação adequada. Evite ambiguidades e garanta que as informações sejam autocontidas.',
    DUPLICATE_CONTENT:
      'Foram identificados artigos com conteúdo duplicado ou muito similar. Analise os artigos envolvidos e decida qual deve ser mantido como principal. Considere mesclar informações relevantes e arquivar os duplicados.',
    INCOMPLETE_CONTENT:
      'Este artigo está incompleto ou faltam informações essenciais. Complete as seções faltantes, adicione exemplos quando necessário e garanta que o artigo responda às principais dúvidas sobre o tema.',
  };

  return recommendations[type] || 'Analise a issue e tome as ações necessárias para resolvê-la.';
}
