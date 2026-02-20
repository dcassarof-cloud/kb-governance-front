import { Palette } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { governanceTexts } from '@/governanceTexts';

export function AppearanceSettings() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="card-metric space-y-6">
      <div className="flex items-center gap-2 text-sm font-semibold text-primary">
        <Palette className="h-4 w-4" />
        <span>Aparência</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label className="text-base">Tema</Label>
          <div className="space-y-2 text-sm">
            <button type="button" onClick={() => setTheme('light')} className="flex items-center gap-2">
              <span className={cn('h-3 w-3 rounded-full border', theme === 'light' && 'bg-primary border-primary')} />
              {governanceTexts.settings.appearance.light}
            </button>
            <button type="button" onClick={() => setTheme('dark')} className="flex items-center gap-2">
              <span className={cn('h-3 w-3 rounded-full border', theme === 'dark' && 'bg-primary border-primary')} />
              {governanceTexts.settings.appearance.dark}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-base">Cores</Label>
          <div className="flex items-center gap-2">
            <span className="h-5 w-5 rounded-full bg-primary border" />
            <span className="h-5 w-5 rounded-full bg-accent border" />
            <span className="h-5 w-5 rounded-full bg-muted border" />
          </div>
          <p className="text-xs text-muted-foreground">Paleta baseada no tema selecionado.</p>
        </div>

        <div className="space-y-2">
          <Label className="text-base">Preview</Label>
          <div className="rounded-md border p-3 space-y-2">
            <div className="h-2 w-16 rounded bg-primary" />
            <div className="h-2 w-24 rounded bg-muted" />
            <div className="h-2 w-20 rounded bg-accent" />
          </div>
        </div>
      </div>
    </div>
  );
}
