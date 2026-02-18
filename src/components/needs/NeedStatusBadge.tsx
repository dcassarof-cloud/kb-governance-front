import { Badge } from '@/components/ui/badge';

import type { NeedStatus } from '@/types/needs-enterprise';

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  CREATED: 'secondary',
  TRIAGED: 'default',
  IN_PROGRESS: 'default',
  BLOCKED: 'destructive',
  DONE: 'outline',
  CANCELLED: 'outline',
};

export const NeedStatusBadge = ({ status }: { status?: NeedStatus | null }) => {
  if (!status) return <Badge variant="outline">—</Badge>;

  const normalized = status.toUpperCase();
  return <Badge variant={STATUS_VARIANTS[normalized] ?? 'secondary'}>{normalized}</Badge>;
};
