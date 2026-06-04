import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTranslations } from 'next-intl';

interface IngestImport {
  _id: string;
  sourceName: string;
  status: string;
  validRows: number;
  duplicateRows: number;
  invalidRows: number;
  createdAt: string;
}

interface IngestionLogProps {
  imports: IngestImport[];
}

export function IngestionLog({ imports }: IngestionLogProps) {
  const t = useTranslations('admin');

  return (
    <Card className="bg-card/40 border-white/5 rounded-none overflow-hidden">
      <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
        <h2 id="audit-log-title" className="text-xs font-bold uppercase tracking-[0.2em]">{t('auditLog')}</h2>
        <Badge variant="outline" className="font-mono text-[9px] uppercase">{imports.length} {t('active')}</Badge>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse" role="table">
          <thead>
            <tr className="bg-white/[0.02] border-b border-white/5">
              <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('timestamp')}</th>
              <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('bankName')}</th>
              <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('status')}</th>
              <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-center">{t('vld')}</th>
              <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-center">{t('dup')}</th>
              <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-center">{t('err')}</th>
              <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right">{t('details')}</th>
            </tr>
          </thead>
          <tbody className="font-mono text-[11px]">
            {imports.map((imp) => (
              <tr key={imp._id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors" role="row">
                <td className="p-4 text-muted-foreground">{new Date(imp.createdAt).toLocaleString()}</td>
                <td className="p-4 font-bold">{imp.sourceName}</td>
                <td className="p-4">
                  <StatusBadge status={imp.status} />
                </td>
                <td className="p-4 text-center text-green-500">{imp.validRows}</td>
                <td className="p-4 text-center text-yellow-500">{imp.duplicateRows}</td>
                <td className="p-4 text-center text-destructive">{imp.invalidRows}</td>
                <td className="p-4 text-right">
                  <button className="text-primary hover:underline uppercase tracking-widest text-[9px]" aria-label={`${t('inspect')} ${imp.sourceName}`}>
                    {t('inspect')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const t = useTranslations('admin');
  const styles: Record<string, string> = {
    completed: "text-green-500 border-green-500/30 bg-green-500/5",
    completed_with_errors: "text-yellow-500 border-yellow-500/30 bg-yellow-500/5",
    failed: "text-destructive border-destructive/30 bg-destructive/5",
    processing: "text-primary border-primary/30 bg-primary/5 animate-pulse"
  };

  const labels: Record<string, string> = {
    completed: t('completed'),
    completed_with_errors: t('errors'),
    failed: t('failed'),
    processing: t('ingesting')
  };

  return (
    <span className={`px-2 py-0.5 border text-[9px] uppercase font-bold tracking-tighter ${styles[status] || ''}`} role="status">
      {labels[status] || status}
    </span>
  );
}
