import { Badge } from '@/components/ui/badge';

import type { NeedSeverity } from '@/types/needs-enterprise';

const SEVERITY_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  LOW: 'outline',
  MEDIUM: 'secondary',
  HIGH: 'default',
  CRITICAL: 'destructive',
};

export const NeedSeverityBadge = ({ severity }: { severity?: NeedSeverity | string | null }) => {
  if (!severity) return <span>—</span>;

  const normalized = severity.toUpperCase();
  return <Badge variant={SEVERITY_VARIANTS[normalized] ?? 'secondary'}>{normalized}</Badge>;
};
