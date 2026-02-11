import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { syncService } from '@/services/sync.service';
import { SyncConfig } from '@/types';
import { toast } from '@/hooks/use-toast';
import { AppearanceSettings } from '@/components/settings/AppearanceSettings';
import { governanceTexts } from '@/governanceTexts';

export default function SettingsPage() {
  const [config, setConfig] = useState<SyncConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    syncService.getSyncConfig().then((result) => { setConfig(result); setLoading(false); });
  }, []);

  const handleSave = async () => {
    if (!config) return;
    await syncService.updateSyncConfig(config);
    toast({ title: governanceTexts.settings.saveSuccess });
  };

  if (loading) {
    return (
      <MainLayout>
        <PageHeader title={governanceTexts.settings.title} />
        <LoadingSkeleton variant="card" />
      </MainLayout>
    );
  }

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
            <Select value={config?.mode} onValueChange={(v) => setConfig(c => c ? { ...c, mode: v as any } : c)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
              <SelectItem value="FULL">{governanceTexts.settings.modeOptions.FULL}</SelectItem>
              <SelectItem value="DELTA">{governanceTexts.settings.modeOptions.DELTA}</SelectItem>
              <SelectItem value="DELTA_WINDOW">{governanceTexts.settings.modeOptions.DELTA_WINDOW}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{governanceTexts.settings.intervalLabel}</Label>
            <Input type="number" value={config?.intervalMinutes} onChange={(e) => setConfig(c => c ? { ...c, intervalMinutes: +e.target.value } : c)} />
          </div>
          <div className="space-y-2">
            <Label>{governanceTexts.settings.daysBackLabel}</Label>
            <Input type="number" value={config?.daysBack} onChange={(e) => setConfig(c => c ? { ...c, daysBack: +e.target.value } : c)} />
          </div>
          <Button onClick={handleSave}><Save className="h-4 w-4 mr-2" /> {governanceTexts.general.save}</Button>
        </div>
      </div>
    </MainLayout>
  );
}
