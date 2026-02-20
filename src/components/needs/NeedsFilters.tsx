import type { NeedsTeamMetricsItem } from '@/types/needs-enterprise';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface NeedsFiltersProps {
  teamMetrics: NeedsTeamMetricsItem[];
  selectedTeamId: string;
  onTeamChange: (teamId: string) => void;
  teamFilterAvailable: boolean;
}

export const NeedsFilters = ({ teamMetrics, selectedTeamId, onTeamChange, teamFilterAvailable }: NeedsFiltersProps) => {
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

      {!teamFilterAvailable ? (
        <Alert>
          <AlertTitle>Filtro por equipe indisponível</AlertTitle>
          <AlertDescription>
            Filtro por equipe indisponível nos itens; exibindo todos.
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
};
