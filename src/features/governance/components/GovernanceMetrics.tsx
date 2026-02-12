import { AlertCircle, AlertTriangle, CalendarClock, Download, RefreshCw, UserPlus } from 'lucide-react';

import { MetricCard } from '@/components/shared/MetricCard';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { governanceTexts } from '@/governanceTexts';
import type { GovernanceOverviewSystemDto } from '@/types';

interface SummaryMetric {
  key: string;
  title: string;
  value: number | null | undefined;
  icon: 'alert' | 'triangle' | 'user' | 'calendar';
  variant: 'warning' | 'error';
}

interface GovernanceMetricsProps {
  overviewLoading: boolean;
  overviewError: string | null;
  summaryMetrics: SummaryMetric[];
  systemRows: GovernanceOverviewSystemDto[];
  onRetryOverview: () => void;
  onSystemClick: (systemCode: string) => void;
  onGenerateReport: () => void;
  generatingReport: boolean;
}

const iconMap = {
  alert: AlertCircle,
  triangle: AlertTriangle,
  user: UserPlus,
  calendar: CalendarClock,
};

export function GovernanceMetrics({
  overviewLoading,
  overviewError,
  summaryMetrics,
  systemRows,
  onRetryOverview,
  onSystemClick,
  onGenerateReport,
  generatingReport,
}: GovernanceMetricsProps) {
  return (
    <>
      {overviewLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((item) => (
            <LoadingSkeleton key={item} variant="card" />
          ))}
        </div>
      ) : overviewError ? (
        <div className="card-metric mb-6">
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <AlertCircle className="h-10 w-10 text-destructive mb-3" />
            <h3 className="font-semibold text-lg mb-2">{governanceTexts.governance.summary.loadError}</h3>
            <p className="text-sm text-muted-foreground mb-4">{overviewError}</p>
            <Button onClick={onRetryOverview}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {governanceTexts.general.retry}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mb-6">
          {summaryMetrics.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {summaryMetrics.map((metric) => {
                const Icon = iconMap[metric.icon];
                return (
                  <MetricCard
                    key={metric.key}
                    title={metric.title}
                    value={metric.value as number}
                    icon={Icon}
                    variant={metric.variant}
                  />
                );
              })}
            </div>
          ) : null}
        </div>
      )}

      <div className="card-metric mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold">{governanceTexts.governance.systems.title}</h3>
            <p className="text-sm text-muted-foreground">{governanceTexts.governance.systems.subtitle}</p>
          </div>
          <Button size="sm" variant="outline" onClick={onGenerateReport} disabled={generatingReport}>
            <Download className="h-4 w-4 mr-2" />
            {generatingReport ? 'Gerando...' : 'Gerar relatório'}
          </Button>
        </div>

        {overviewLoading ? (
          <LoadingSkeleton variant="table" rows={4} />
        ) : overviewError ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h3 className="font-semibold text-lg mb-2">{governanceTexts.governance.systems.loadError}</h3>
            <p className="text-sm text-muted-foreground mb-4">{overviewError}</p>
            <Button onClick={onRetryOverview}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {governanceTexts.general.retry}
            </Button>
          </div>
        ) : systemRows.length === 0 ? (
          <EmptyState
            icon={AlertTriangle}
            title={governanceTexts.governance.systems.emptyTitle}
            description={governanceTexts.governance.systems.emptyDescription}
          />
        ) : (
          <div className="table-container overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-semibold text-sm">{governanceTexts.governance.systems.table.system}</th>
                  <th className="text-left p-4 font-semibold text-sm">{governanceTexts.governance.systems.table.healthScore}</th>
                  <th className="text-left p-4 font-semibold text-sm">{governanceTexts.governance.systems.table.open}</th>
                  <th className="text-left p-4 font-semibold text-sm">{governanceTexts.governance.systems.table.critical}</th>
                  <th className="text-left p-4 font-semibold text-sm">{governanceTexts.governance.systems.table.overdue}</th>
                  <th className="text-left p-4 font-semibold text-sm">{governanceTexts.governance.systems.table.unassigned}</th>
                </tr>
              </thead>
              <tbody>
                {systemRows.map((system) => {
                  const score = typeof system.healthScore === 'number' ? Math.round(system.healthScore) : null;
                  return (
                    <tr
                      key={system.systemCode}
                      className="border-t border-border hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => onSystemClick(system.systemCode)}
                    >
                      <td className="p-4 font-medium">
                        <div>{system.systemName || system.systemCode}</div>
                        <div className="text-xs text-muted-foreground">{system.systemCode}</div>
                      </td>
                      <td className="p-4">
                        {score !== null ? (
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-24 rounded-full bg-muted">
                              <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.min(score, 100)}%` }} />
                            </div>
                            <span className="text-sm text-muted-foreground">{score}%</span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">{governanceTexts.general.notAvailable}</span>
                        )}
                      </td>
                      <td className="p-4 text-muted-foreground">{system.openIssues ?? 0}</td>
                      <td className="p-4 text-muted-foreground">{system.errorOpen ?? 0}</td>
                      <td className="p-4 text-muted-foreground">{system.overdueOpen ?? 0}</td>
                      <td className="p-4 text-muted-foreground">{system.unassignedOpen ?? 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
