import type { NeedsTeamMetricsItem } from '@/types/needs-enterprise';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface NeedsFiltersProps {
  teamMetrics: NeedsTeamMetricsItem[];
  selectedTeamId: string;
  onTeamChange: (teamId: string) => void;
}

export const NeedsFilters = ({ teamMetrics, selectedTeamId, onTeamChange }: NeedsFiltersProps) => {
  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="space-y-2">
        <Label>Equipe</Label>
        <Select value={selectedTeamId} onValueChange={onTeamChange}>
          <SelectTrigger>
            <SelectValue placeholder="Todas as equipes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {teamMetrics.map((team) => (
              <SelectItem key={String(team.teamId)} value={String(team.teamId)}>
                {team.teamName || `Equipe ${team.teamId}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
