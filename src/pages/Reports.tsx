import { FileText, Download, FileSpreadsheet } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

const reports = [
  { title: 'Relatório de Manuais', description: 'Lista completa de todos os artigos', icon: FileText },
  { title: 'Relatório de Issues', description: 'Problemas de governança identificados', icon: FileSpreadsheet },
  { title: 'Relatório por Sistema', description: 'Métricas agrupadas por sistema', icon: FileSpreadsheet },
];

export default function ReportsPage() {
  const handleExport = (type: string) => {
    toast({ title: 'Exportação iniciada', description: `Gerando ${type}... (placeholder)` });
  };

  return (
    <MainLayout>
      <PageHeader title="Relatórios" description="Exporte dados e relatórios" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map((report) => (
          <div key={report.title} className="card-metric">
            <report.icon className="h-10 w-10 text-primary mb-4" />
            <h3 className="font-semibold mb-1">{report.title}</h3>
            <p className="text-sm text-muted-foreground mb-4">{report.description}</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => handleExport('CSV')}><Download className="h-4 w-4 mr-1" /> CSV</Button>
              <Button size="sm" variant="outline" onClick={() => handleExport('PDF')}><Download className="h-4 w-4 mr-1" /> PDF</Button>
            </div>
          </div>
        ))}
      </div>
    </MainLayout>
  );
}
