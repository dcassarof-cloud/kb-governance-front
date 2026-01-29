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

export default function SettingsPage() {
  const [config, setConfig] = useState<SyncConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    syncService.getSyncConfig().then((result) => { setConfig(result); setLoading(false); });
  }, []);

  const handleSave = async () => {
    if (!config) return;
    await syncService.updateSyncConfig(config);
    toast({ title: 'Configurações salvas!' });
  };

  if (loading) return <MainLayout><PageHeader title="Configurações" /><LoadingSkeleton variant="card" /></MainLayout>;

  return (
    <MainLayout>
      <PageHeader title="Configurações" description="Configurações de sincronização automática" />
      <div className="max-w-xl space-y-6">
        <AppearanceSettings />
        <div className="card-metric space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>Sync Automático</Label>
              <p className="text-sm text-muted-foreground">Ativar sincronização automática</p>
            </div>
            <Switch checked={config?.enabled} onCheckedChange={(v) => setConfig(c => c ? { ...c, enabled: v } : c)} />
          </div>
          <div className="space-y-2">
            <Label>Modo</Label>
            <Select value={config?.mode} onValueChange={(v) => setConfig(c => c ? { ...c, mode: v as any } : c)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="FULL">Completo</SelectItem>
                <SelectItem value="INCREMENTAL">Incremental</SelectItem>
                <SelectItem value="DELTA">Delta</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Intervalo (minutos)</Label>
            <Input type="number" value={config?.intervalMinutes} onChange={(e) => setConfig(c => c ? { ...c, intervalMinutes: +e.target.value } : c)} />
          </div>
          <div className="space-y-2">
            <Label>Dias retroativos</Label>
            <Input type="number" value={config?.daysBack} onChange={(e) => setConfig(c => c ? { ...c, daysBack: +e.target.value } : c)} />
          </div>
          <Button onClick={handleSave}><Save className="h-4 w-4 mr-2" /> Salvar</Button>
        </div>
      </div>
    </MainLayout>
  );
}
