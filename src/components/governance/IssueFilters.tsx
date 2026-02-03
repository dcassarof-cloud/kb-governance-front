// =====================================================
// ISSUE FILTERS - Consisa KB Governance (Sprint 5)
// =====================================================

import { RefreshCw, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { IssueType, IssueSeverity, IssueStatus, KbSystem } from '@/types';
import { IssuesFilter } from '@/services/governance.service';

const ISSUE_TYPE_LABELS: Record<IssueType, string> = {
  REVIEW_REQUIRED: 'Revisão necessária',
  NOT_AI_READY: 'Não pronto para IA',
  DUPLICATE_CONTENT: 'Conteúdo Duplicado',
  INCOMPLETE_CONTENT: 'Conteúdo Incompleto',
};

const ISSUE_STATUS_LABELS: Record<IssueStatus, string> = {
  OPEN: 'Aberta',
  ASSIGNED: 'Atribuída',
  IN_PROGRESS: 'Em Progresso',
  RESOLVED: 'Resolvida',
  IGNORED: 'Ignorada',
};

const ISSUE_SEVERITY_LABELS: Record<IssueSeverity, string> = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
  CRITICAL: 'Crítica',
};

interface IssueFiltersProps {
  filters: IssuesFilter;
  systems: KbSystem[];
  onFilterChange: (key: keyof IssuesFilter, value: unknown) => void;
  onClearFilters: () => void;
  onRefresh: () => void;
  isLoading?: boolean;
}

export function IssueFilters({
  filters,
  systems,
  onFilterChange,
  onClearFilters,
  onRefresh,
  isLoading,
}: IssueFiltersProps) {
  const typeOptions: IssueType[] = ['REVIEW_REQUIRED', 'NOT_AI_READY', 'DUPLICATE_CONTENT', 'INCOMPLETE_CONTENT'];
  const severityOptions: IssueSeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  const statusOptions: IssueStatus[] = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'IGNORED'];

  return (
    <div className="card-metric mb-6">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Filter className="h-5 w-5" />
        Filtros Avançados
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {/* Sistema */}
        <div className="space-y-2">
          <Label>Sistema</Label>
          <Select
            value={filters.systemCode || 'ALL'}
            onValueChange={(value) => onFilterChange('systemCode', value === 'ALL' ? '' : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos os sistemas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos</SelectItem>
              {systems.map((system) => (
                <SelectItem key={system.code} value={system.code}>
                  {system.name || system.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status */}
        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={filters.status || 'ALL'}
            onValueChange={(value) => onFilterChange('status', value === 'ALL' ? undefined : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos os status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos</SelectItem>
              {statusOptions.map((status) => (
                <SelectItem key={status} value={status}>
                  {ISSUE_STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Severidade */}
        <div className="space-y-2">
          <Label>Severidade</Label>
          <Select
            value={filters.severity || 'ALL'}
            onValueChange={(value) => onFilterChange('severity', value === 'ALL' ? undefined : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todas as severidades" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas</SelectItem>
              {severityOptions.map((severity) => (
                <SelectItem key={severity} value={severity}>
                  {ISSUE_SEVERITY_LABELS[severity]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tipo */}
        <div className="space-y-2">
          <Label>Tipo</Label>
          <Select
            value={filters.type || 'ALL'}
            onValueChange={(value) => onFilterChange('type', value === 'ALL' ? undefined : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos os tipos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos</SelectItem>
              {typeOptions.map((type) => (
                <SelectItem key={type} value={type}>
                  {ISSUE_TYPE_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Busca */}
        <div className="space-y-2">
          <Label>Busca</Label>
          <Input
            placeholder="Buscar por título ou descrição"
            value={filters.q || ''}
            onChange={(e) => onFilterChange('q', e.target.value)}
          />
        </div>

        {/* Responsável */}
        <div className="space-y-2">
          <Label>Responsável</Label>
          <Input
            placeholder="Filtrar por responsável"
            value={filters.responsible || ''}
            onChange={(e) => onFilterChange('responsible', e.target.value)}
          />
        </div>

        {/* Checkboxes - Vencidas e Sem responsável */}
        <div className="space-y-3 col-span-1 md:col-span-2">
          <Label>Filtros Rápidos</Label>
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="filter-overdue"
                checked={filters.overdue || false}
                onCheckedChange={(checked) => onFilterChange('overdue', checked === true ? true : undefined)}
              />
              <label
                htmlFor="filter-overdue"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Apenas vencidas (SLA)
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="filter-unassigned"
                checked={filters.unassigned || false}
                onCheckedChange={(checked) => onFilterChange('unassigned', checked === true ? true : undefined)}
              />
              <label
                htmlFor="filter-unassigned"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Apenas sem responsável
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Ações */}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="outline" onClick={onClearFilters}>
          Limpar filtros
        </Button>
        <Button variant="secondary" onClick={onRefresh} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar lista
        </Button>
      </div>
    </div>
  );
}

export { ISSUE_TYPE_LABELS, ISSUE_STATUS_LABELS, ISSUE_SEVERITY_LABELS };
