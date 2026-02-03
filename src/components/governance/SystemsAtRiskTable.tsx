// =====================================================
// SYSTEMS AT RISK TABLE - Consisa KB Governance (Sprint 5)
// =====================================================

import { AlertTriangle, TrendingDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { GovernanceSystemHealthDto } from '@/types';
import { cn } from '@/lib/utils';

interface SystemsAtRiskTableProps {
  systems: GovernanceSystemHealthDto[];
  isLoading: boolean;
  onSystemClick?: (systemCode: string) => void;
}

function getHealthScoreColor(score: number): string {
  if (score >= 80) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
  if (score >= 60) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
  if (score >= 40) return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
  return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
}

function getHealthScoreLabel(score: number): string {
  if (score >= 80) return 'Saudável';
  if (score >= 60) return 'Atenção';
  if (score >= 40) return 'Alerta';
  return 'Crítico';
}

export function SystemsAtRiskTable({ systems, isLoading, onSystemClick }: SystemsAtRiskTableProps) {
  if (isLoading) {
    return (
      <div className="card-metric mb-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-destructive" />
          Sistemas em Risco
        </h3>
        <LoadingSkeleton variant="table" rows={5} />
      </div>
    );
  }

  // Ordena por menor score primeiro
  const sortedSystems = [...systems].sort((a, b) => a.healthScore - b.healthScore);

  return (
    <div className="card-metric mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-destructive" />
          Sistemas em Risco
        </h3>
        <span className="text-sm text-muted-foreground">
          {systems.length} sistema{systems.length !== 1 ? 's' : ''}
        </span>
      </div>

      {sortedSystems.length === 0 ? (
        <EmptyState
          icon={AlertTriangle}
          title="Nenhum sistema em risco"
          description="Todos os sistemas estão com saúde adequada."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-semibold text-sm">Sistema</th>
                <th className="text-center p-3 font-semibold text-sm">Health Score</th>
                <th className="text-center p-3 font-semibold text-sm">Abertas</th>
                <th className="text-center p-3 font-semibold text-sm">Críticas</th>
                <th className="text-center p-3 font-semibold text-sm">Vencidas</th>
                <th className="text-center p-3 font-semibold text-sm">Sem Responsável</th>
              </tr>
            </thead>
            <tbody>
              {sortedSystems.map((system) => (
                <tr
                  key={system.systemCode}
                  className={cn(
                    'border-t border-border transition-colors',
                    onSystemClick && 'hover:bg-muted/30 cursor-pointer'
                  )}
                  onClick={() => onSystemClick?.(system.systemCode)}
                >
                  <td className="p-3">
                    <div className="font-medium">{system.systemName || system.systemCode}</div>
                    <div className="text-xs text-muted-foreground">{system.systemCode}</div>
                  </td>
                  <td className="p-3 text-center">
                    <Badge className={getHealthScoreColor(system.healthScore)}>
                      {system.healthScore}% - {getHealthScoreLabel(system.healthScore)}
                    </Badge>
                  </td>
                  <td className="p-3 text-center">
                    <span className={system.openIssues > 0 ? 'font-semibold' : 'text-muted-foreground'}>
                      {system.openIssues}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <span className={system.criticalIssues > 0 ? 'font-semibold text-destructive' : 'text-muted-foreground'}>
                      {system.criticalIssues}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <span className={system.overdueIssues > 0 ? 'font-semibold text-destructive' : 'text-muted-foreground'}>
                      {system.overdueIssues}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <span className={system.unassignedIssues > 0 ? 'font-semibold text-amber-600' : 'text-muted-foreground'}>
                      {system.unassignedIssues}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
