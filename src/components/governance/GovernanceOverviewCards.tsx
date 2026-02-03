// =====================================================
// GOVERNANCE OVERVIEW CARDS - Consisa KB Governance (Sprint 5)
// =====================================================

import { AlertTriangle, AlertCircle, UserX, Clock, RefreshCw } from 'lucide-react';
import { MetricCard } from '@/components/shared/MetricCard';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { Button } from '@/components/ui/button';
import { GovernanceTotalsDto } from '@/types';

interface GovernanceOverviewCardsProps {
  totals: GovernanceTotalsDto | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onCardClick?: (filter: string) => void;
}

export function GovernanceOverviewCards({
  totals,
  isLoading,
  error,
  onRetry,
  onCardClick,
}: GovernanceOverviewCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((item) => (
          <LoadingSkeleton key={item} variant="card" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="card-metric mb-6">
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <AlertCircle className="h-10 w-10 text-destructive mb-3" />
          <h3 className="font-semibold text-lg mb-2">Erro ao carregar indicadores</h3>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button onClick={onRetry}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  if (!totals) {
    return (
      <div className="card-metric mb-6">
        <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
          <AlertCircle className="h-10 w-10 mb-2" />
          <p className="text-sm">Indicadores indisponíveis no momento.</p>
        </div>
      </div>
    );
  }

  const cards = [
    {
      key: 'open',
      title: 'Issues Abertas',
      value: totals.openIssues,
      icon: AlertTriangle,
      variant: 'primary' as const,
      filter: 'open',
    },
    {
      key: 'critical',
      title: 'Críticas',
      value: totals.criticalIssues,
      icon: AlertCircle,
      variant: 'error' as const,
      filter: 'critical',
    },
    {
      key: 'unassigned',
      title: 'Sem Responsável',
      value: totals.unassignedIssues,
      icon: UserX,
      variant: 'warning' as const,
      filter: 'unassigned',
    },
    {
      key: 'overdue',
      title: 'Vencidas (SLA)',
      value: totals.overdueIssues,
      icon: Clock,
      variant: 'error' as const,
      filter: 'overdue',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card) => (
        <div
          key={card.key}
          className={onCardClick ? 'cursor-pointer transition-transform hover:scale-[1.02]' : ''}
          onClick={() => onCardClick?.(card.filter)}
        >
          <MetricCard
            title={card.title}
            value={card.value}
            icon={card.icon}
            variant={card.variant}
          />
        </div>
      ))}
    </div>
  );
}
