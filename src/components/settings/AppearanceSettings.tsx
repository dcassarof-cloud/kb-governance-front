import { Palette } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export function AppearanceSettings() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="card-metric space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-primary">
        <Palette className="h-4 w-4" />
        <span>🎨 Aparência</span>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Label className="text-base">Tema do sistema</Label>
          <p className="text-sm text-muted-foreground">
            Personalize a aparência do sistema de acordo com sua preferência.
          </p>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className="flex items-center gap-2"
            >
              <span
                className={cn(
                  'h-3 w-3 rounded-full border border-muted-foreground/50',
                  theme === 'light' && 'border-primary bg-primary'
                )}
              />
              <span className={cn(theme === 'light' && 'font-semibold text-primary')}>
                Claro
              </span>
            </button>
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className="flex items-center gap-2"
            >
              <span
                className={cn(
                  'h-3 w-3 rounded-full border border-muted-foreground/50',
                  theme === 'dark' && 'border-primary bg-primary'
                )}
              />
              <span className={cn(theme === 'dark' && 'font-semibold text-primary')}>
                Escuro
              </span>
            </button>
          </div>
        </div>
        <Switch
          checked={isDark}
          onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
          aria-label="Alternar tema do sistema"
        />
      </div>
    </div>
  );
}
