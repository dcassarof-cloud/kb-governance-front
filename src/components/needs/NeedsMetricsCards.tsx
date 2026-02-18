import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

import type { NeedMetricsSummaryResponse } from '@/types/needs-enterprise';

interface NeedsMetricsCardsProps {
  data?: NeedMetricsSummaryResponse;
  isLoading?: boolean;
}

export const NeedsMetricsCards = ({ data, isLoading = false }: NeedsMetricsCardsProps) => {
  const cards = [
    { label: 'Em aberto', value: data?.totalOpen ?? 0 },
    { label: 'Triadas', value: data?.triaged ?? 0 },
    { label: 'Em progresso', value: data?.inProgress ?? 0 },
    { label: 'Bloqueadas', value: data?.blocked ?? 0 },
    { label: 'Vencidas', value: data?.overdue ?? 0, attention: true },
    { label: 'Críticas abertas', value: data?.criticalOpen ?? 0, attention: true },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            {isLoading ? <Skeleton className="h-8 w-12" /> : <span className="text-2xl font-semibold">{card.value}</span>}
            {card.attention ? <Badge variant="destructive">Atenção</Badge> : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
