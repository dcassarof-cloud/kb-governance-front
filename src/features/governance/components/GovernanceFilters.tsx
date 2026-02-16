import { RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { governanceTexts } from '@/governanceTexts';
import type { IssueSeverity, IssueStatus, IssueType } from '@/types';
import type { GovernanceFilters } from '@/features/governance/state/governanceReducer';
import { ISSUE_TYPE_LABELS } from '@/features/governance/hooks/useGovernance';

interface GovernanceFiltersProps {
  filters: GovernanceFilters;
  isManager: boolean;
  systemOptions: string[];
  resolvedStatusOptions: Array<string | IssueStatus>;
  resolvedTypeOptions: Array<string | IssueType>;
  resolvedSeverityOptions: IssueSeverity[];
  isCriticalOnly: boolean;
  onFilterChange: (key: keyof GovernanceFilters, value: string) => void;
  onToggleChange: (key: 'overdue' | 'unassigned', value: boolean) => void;
  onCriticalToggle: (value: boolean) => void;
  onClearFilters: () => void;
  onRefresh: () => void;
}

/**
 * Bloco de filtros da fila de governança.
 *
 * Observação: os eventos disparam atualização de estado que posteriormente
 * sincroniza com URLSearchParams (fonte de verdade para filtros compartilháveis).
 */
export function GovernanceFilters({
  filters,
  isManager,
  systemOptions,
  resolvedStatusOptions,
  resolvedTypeOptions,
  resolvedSeverityOptions,
  isCriticalOnly,
  onFilterChange,
  onToggleChange,
  onCriticalToggle,
  onClearFilters,
  onRefresh,
}: GovernanceFiltersProps) {
  return (
    <div className="card-metric mb-6">
      <h3 className="font-semibold mb-4">{governanceTexts.governance.filtersTitle}</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>{governanceTexts.governance.filters.type}</Label>
          <Select
            value={filters.type || 'ALL'}
            onValueChange={(value) => onFilterChange('type', value === 'ALL' ? '' : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder={governanceTexts.governance.filters.typePlaceholder} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{governanceTexts.governance.filters.typePlaceholder}</SelectItem>
              {resolvedTypeOptions.map((type) => (
                <SelectItem key={type} value={type}>
                  {ISSUE_TYPE_LABELS[type as IssueType] || type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label>{governanceTexts.governance.filters.severity}</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-xs text-muted-foreground cursor-help">?</span>
                </TooltipTrigger>
                <TooltipContent>{governanceTexts.severity.tooltip}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Select
            value={filters.severity || 'ALL'}
            onValueChange={(value) => onFilterChange('severity', value === 'ALL' ? '' : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder={governanceTexts.governance.filters.severityPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{governanceTexts.governance.filters.severityPlaceholder}</SelectItem>
              {resolvedSeverityOptions.map((severity) => (
                <SelectItem key={severity} value={severity}>
                  {governanceTexts.severity.labels[severity]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{governanceTexts.governance.filters.system}</Label>
          <Select
            value={filters.systemCode || 'ALL'}
            onValueChange={(value) => onFilterChange('systemCode', value === 'ALL' ? '' : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder={governanceTexts.governance.filters.systemPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{governanceTexts.governance.filters.systemPlaceholder}</SelectItem>
              {systemOptions.map((system) => (
                <SelectItem key={system} value={system}>
                  {system}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{governanceTexts.governance.filters.status}</Label>
          <Select
            value={filters.status || 'ALL'}
            onValueChange={(value) => onFilterChange('status', value === 'ALL' ? '' : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder={governanceTexts.governance.filters.statusPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{governanceTexts.governance.filters.statusPlaceholder}</SelectItem>
              {resolvedStatusOptions.map((status) => (
                <SelectItem key={status} value={status}>
                  {governanceTexts.status.labels[status as IssueStatus]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{governanceTexts.governance.filters.search}</Label>
          <Input
            placeholder={governanceTexts.governance.filters.searchPlaceholder}
            value={filters.q || ''}
            onChange={(event) => onFilterChange('q', event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>{governanceTexts.governance.filters.responsible}</Label>
          <Input
            placeholder={governanceTexts.governance.filters.responsiblePlaceholder}
            value={filters.responsibleId || ''}
            onChange={(event) => onFilterChange('responsibleId', event.target.value)}
            disabled={!isManager}
          />
        </div>

        <div className="space-y-2">
          <Label>{governanceTexts.governance.assignDialog.responsibleTypeLabel}</Label>
          <Select
            value={filters.responsibleType || 'ALL'}
            onValueChange={(value) => onFilterChange('responsibleType', value === 'ALL' ? '' : value)}
            disabled={!isManager}
          >
            <SelectTrigger>
              <SelectValue placeholder={governanceTexts.governance.assignDialog.responsibleTypePlaceholder} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{governanceTexts.general.all}</SelectItem>
              <SelectItem value="AGENT">{governanceTexts.governance.assignDialog.responsibleTypeOptions.AGENT}</SelectItem>
              <SelectItem value="TEAM">{governanceTexts.governance.assignDialog.responsibleTypeOptions.TEAM}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="filter-critical"
            checked={Boolean(isCriticalOnly)}
            onCheckedChange={(checked) => onCriticalToggle(Boolean(checked))}
          />
          <Label htmlFor="filter-critical" className="text-sm font-medium">
            {governanceTexts.governance.filters.criticalOnly}
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="filter-overdue"
            checked={Boolean(filters.overdue)}
            onCheckedChange={(checked) => onToggleChange('overdue', Boolean(checked))}
          />
          <Label htmlFor="filter-overdue" className="text-sm font-medium">
            {governanceTexts.governance.filters.overdue}
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="filter-unassigned"
            checked={Boolean(filters.unassigned)}
            onCheckedChange={(checked) => onToggleChange('unassigned', Boolean(checked))}
          />
          <Label htmlFor="filter-unassigned" className="text-sm font-medium">
            {governanceTexts.governance.filters.unassigned}
          </Label>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="outline" onClick={onClearFilters}>
          {governanceTexts.general.clearFilters}
        </Button>

        <Button variant="secondary" onClick={onRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          {governanceTexts.general.refreshList}
        </Button>
      </div>
    </div>
  );
}
