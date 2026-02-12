import { useEffect, useState } from 'react';
import { AlertCircle, Info, Loader2, RefreshCw, Save } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { syncService } from '@/services/sync.service';
import { SyncConfig, SyncMode } from '@/types';
import { toast } from '@/hooks/use-toast';
import { AppearanceSettings } from '@/components/settings/AppearanceSettings';
import { governanceTexts } from '@/governanceTexts';
import { toApiErrorInfo, formatApiErrorInfo } from '@/lib/api-error-info';

/** Map DELTA_WINDOW to DELTA for display; keep FULL as-is. */
const displayMode = (mode?: SyncMode): string => {
  if (!mode) return 'DELTA';
  if (mode === 'DELTA_WINDOW' || mode === 'DELTA') return 'DELTA';
  return mode;
};

/** Map display value back to the value the backend expects. */
const toBackendMode = (display: string): SyncMode => {
  if (display === 'DELTA') return 'DELTA';
  return display as SyncMode;
};

interface ValidationErrors {
  intervalMinutes?: string;
  daysBack?: string;
}

const validate = (config: SyncConfig): ValidationErrors => {
  const errors: ValidationErrors = {};
  if (!Number.isFinite(config.intervalMinutes) || config.intervalMinutes < 1) {
    errors.intervalMinutes = 'O intervalo deve ser no mínimo 1 minuto.';
  }
  if (!Number.isFinite(config.daysBack) || config.daysBack < 0) {
    errors.daysBack = 'Dias retroativos deve ser 0 ou maior.';
  }
  return errors;
};

export default function SettingsPage() {
  const [config, setConfig] = useState<SyncConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});

  const loadConfig = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const result = await syncService.getSyncConfig();
      setConfig(result);
    } catch (err) {
      const info = toApiErrorInfo(err, 'Não foi possível carregar as configurações.');
      setLoadError(formatApiErrorInfo(info));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const handleSave = async () => {
    if (!config) return;

    const validationErrors = validate(config);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      toast({
        title: 'Dados inválidos',
        description: 'Corrija os campos destacados antes de salvar.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const saved = await syncService.updateSyncConfig(config);
      setConfig(saved);
      toast({ title: governanceTexts.settings.saveSuccess });
    } catch (err) {
      const info = toApiErrorInfo(err, 'Não foi possível salvar as configurações.');
      toast({ title: governanceTexts.general.errorTitle, description: formatApiErrorInfo(info), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <PageHeader title={governanceTexts.settings.title} />
        <LoadingSkeleton variant="card" />
      </MainLayout>
    );
  }

  if (loadError) {
    return (
      <MainLayout>
        <PageHeader title={governanceTexts.settings.title} />
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm space-y-3">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>{loadError}</span>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={loadConfig}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Recarregar
          </Button>
        </div>
      </MainLayout>
    );
  }

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <MainLayout>
      <PageHeader title={governanceTexts.settings.title} description={governanceTexts.settings.description} />
      <div className="max-w-xl space-y-6">
        <AppearanceSettings />
        <div className="card-metric space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>{governanceTexts.settings.syncTitle}</Label>
              <p className="text-sm text-muted-foreground">{governanceTexts.settings.syncDescription}</p>
            </div>
            <Switch checked={config?.enabled} onCheckedChange={(v) => setConfig(c => c ? { ...c, enabled: v } : c)} />
          </div>

          <div className="space-y-2">
            <Label>{governanceTexts.settings.modeLabel}</Label>
            <Select
              value={displayMode(config?.mode)}
              onValueChange={(v) => setConfig(c => c ? { ...c, mode: toBackendMode(v) } : c)}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="FULL">Atualização completa</SelectItem>
                <SelectItem value="DELTA">Atualização incremental</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground flex items-start gap-1">
              <Info className="h-3 w-3 mt-0.5 shrink-0" />
              {displayMode(config?.mode) === 'DELTA'
                ? 'Busca somente o que mudou desde a última sincronização.'
                : 'Reprocessa todos os artigos do zero.'}
            </p>
          </div>

          <div className="space-y-2">
            <Label>{governanceTexts.settings.intervalLabel}</Label>
            <Input
              type="number"
              min={1}
              value={config?.intervalMinutes}
              onChange={(e) => {
                const v = +e.target.value;
                setConfig(c => c ? { ...c, intervalMinutes: v } : c);
                if (errors.intervalMinutes && Number.isFinite(v) && v >= 1) {
                  setErrors(prev => { const next = { ...prev }; delete next.intervalMinutes; return next; });
                }
              }}
              className={errors.intervalMinutes ? 'border-destructive' : ''}
            />
            {errors.intervalMinutes && (
              <p className="text-xs text-destructive">{errors.intervalMinutes}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>{governanceTexts.settings.daysBackLabel}</Label>
            <Input
              type="number"
              min={0}
              value={config?.daysBack}
              onChange={(e) => {
                const v = +e.target.value;
                setConfig(c => c ? { ...c, daysBack: v } : c);
                if (errors.daysBack && Number.isFinite(v) && v >= 0) {
                  setErrors(prev => { const next = { ...prev }; delete next.daysBack; return next; });
                }
              }}
              className={errors.daysBack ? 'border-destructive' : ''}
            />
            {errors.daysBack && (
              <p className="text-xs text-destructive">{errors.daysBack}</p>
            )}
            <p className="text-xs text-muted-foreground flex items-start gap-1">
              <Info className="h-3 w-3 mt-0.5 shrink-0" />
              Até quantos dias atrás considerar alterações na sincronização incremental.
            </p>
          </div>

          <Button onClick={handleSave} disabled={saving || hasErrors}>
            {saving ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Salvando...
              </span>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" /> {governanceTexts.general.save}
              </>
            )}
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}
