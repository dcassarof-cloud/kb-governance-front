import { EmptyState } from '@/components/shared/EmptyState';

interface NeedsEmptyStateProps {
  title: string;
  description: string;
  onReload: () => void;
}

export const NeedsEmptyState = ({ title, description, onReload }: NeedsEmptyStateProps) => (
  <EmptyState title={title} description={description} action={{ label: 'Recarregar', onClick: onReload }} />
);
