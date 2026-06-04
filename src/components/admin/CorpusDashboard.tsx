'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { getCorpusStatsAction, getImportsAction } from '@/actions/corpus';
import { Filter, X, FileJson } from 'lucide-react';
import { ImportDialog } from './IngestDialog';
import { TemplateModal } from './TemplateModal';
import { KpiGrid } from './KpiGrid';
import { IngestionLog } from './IngestionLog';
import { useTranslations } from 'next-intl';

interface CorpusDashboardStats {
  totalQuestions: number;
  activeQuestions: number;
  moduleCount: number;
  sourceCount: number;
  duplicatesLast30Days: number;
  modules: string[];
}

interface IngestImport {
  _id: string;
  sourceName: string;
  status: string;
  validRows: number;
  duplicateRows: number;
  invalidRows: number;
  createdAt: string;
}

export interface CorpusDashboardProps {
  tenantId: string;
}

export default function CorpusDashboard({ 
  tenantId 
}: CorpusDashboardProps) {
  const t = useTranslations('admin');
  const common = useTranslations('common');
  const [stats, setStats] = useState<CorpusDashboardStats | null>(null);
  const [imports, setImports] = useState<IngestImport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [filters, setFilters] = useState({ status: '', sourceType: '', module: '', source: '', datePreset: 'all' });
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);

  const fetchData = useCallback(async () => {
    let startDate: string | undefined;
    const now = new Date();
    if (filters.datePreset === 'today') startDate = new Date(new Date().setHours(0,0,0,0)).toISOString();
    if (filters.datePreset === '7d') startDate = new Date(now.setDate(now.getDate() - 7)).toISOString();
    if (filters.datePreset === '30d') startDate = new Date(now.setDate(now.getDate() - 30)).toISOString();

    const [statsRes, importsRes] = await Promise.all([
      getCorpusStatsAction(),
      getImportsAction({ startDate, status: filters.status || undefined, sourceType: filters.sourceType || undefined, module: filters.module || undefined, source: filters.source || undefined })
    ]);

    return { stats: statsRes, imports: importsRes };
  }, [filters]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchData();
      if (res.stats.success && res.stats.data) setStats(res.stats.data);
      if (res.imports.success && res.imports.data) {
        setImports((res.imports.data as unknown) as IngestImport[]);
      }
      setHasFetchedOnce(true);
    } finally {
      setIsLoading(false);
    }
  }, [fetchData]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh().catch(console.error);
  }, [refresh]);

  if (isLoading && !stats && !hasFetchedOnce) {
    return <div className="p-8 text-muted-foreground font-mono animate-pulse text-center" role="status">{common('initializing')}</div>;
  }

  return (
    <div className="flex flex-col gap-8">
      {showImportDialog && <ImportDialog onClose={() => setShowImportDialog(false)} onSuccess={refresh} />}
      {showTemplateModal && <TemplateModal onClose={() => setShowTemplateModal(false)} />}
      <KpiGrid stats={stats} />

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        <nav className="xl:col-span-1 space-y-6" aria-label="Filters">
          <Card className="p-6 bg-card/40 border-white/5 rounded-none">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] mb-6 text-primary">{t('ingestionControls')}</h2>
            <div className="flex flex-col gap-2 mb-6">
              <button onClick={() => setShowImportDialog(true)} className="btn-primary-console w-full" aria-label={t('importBank')}>{t('importBank')}</button>
              <button aria-label={t('downloadTemplates')} onClick={() => setShowTemplateModal(true)} className="w-full py-2 text-[9px] uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-2 border border-white/5 hover:border-primary/20">
                <FileJson className="w-3 h-3" aria-hidden="true" /> {t('downloadTemplates')}
              </button>
            </div>
            <Separator className="bg-white/5 my-6" aria-hidden="true" />
            <div className="space-y-6">
               <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-2"><Filter className="w-3 h-3" aria-hidden="true" /> {t('filters')}</h3>
               <div className="space-y-4">
                 <FilterGroup label={t('dateRange')}>
                   <div className="grid grid-cols-2 gap-2">
                     {['all', 'today', '7d', '30d'].map(p => (
                       <FilterButton key={p} active={filters.datePreset === p} onClick={() => setFilters({...filters, datePreset: p})}>{t(p === 'all' ? 'allTime' : p === '7d' ? 'last7d' : p === '30d' ? 'last30d' : 'today')}</FilterButton>
                     ))}
                   </div>
                 </FilterGroup>
                 <FilterSelect label={t('status')} value={filters.status} onChange={v => setFilters({...filters, status: v})} options={[{v: '', l: t('allStatuses')}, {v: 'completed', l: t('completed')}, {v: 'completed_with_errors', l: t('errors')}, {v: 'failed', l: t('failed')}]} />
                 <FilterSelect label={t('sourceType')} value={filters.sourceType} onChange={v => setFilters({...filters, sourceType: v})} options={[{v: '', l: t('allFormats')}, {v: 'json', l: t('json')}, {v: 'csv', l: t('csv')}]} />
                 <FilterSelect label={t('byModule')} value={filters.module} onChange={v => setFilters({...filters, module: v})} options={[{v: '', l: t('allModules')}, ...(stats?.modules?.map((m: string) => ({v: m, l: m})) || [])]} />
                 <button onClick={() => setFilters({status: '', sourceType: '', module: '', source: '', datePreset: 'all'})} className="text-[9px] uppercase tracking-widest text-muted-foreground hover:text-primary flex items-center gap-2 pt-2" aria-label={t('reset')}><X className="w-3 h-3" aria-hidden="true" /> {t('reset')}</button>
               </div>
            </div>
          </Card>
        </nav>
        <section className="xl:col-span-3"><IngestionLog imports={imports} /></section>
      </div>
    </div>
  );
}

function FilterGroup({ label, children }: { label: string, children: React.ReactNode }) { return <div className="space-y-2"><label className="text-[8px] uppercase tracking-[0.3em] text-muted-foreground/60 font-bold">{label}</label>{children}</div>; }
function FilterButton({ active, onClick, children }: { active: boolean, onClick: () => void, children: React.ReactNode }) { return <button onClick={onClick} className={`px-2 py-1.5 text-[9px] uppercase font-bold border transition-all ${active ? "border-primary text-primary bg-primary/5" : "border-white/5 text-muted-foreground hover:border-white/20"}`}>{children}</button>; }
function FilterSelect({ label, value, onChange, options }: { label: string, value: string, onChange: (v: string) => void, options: {v: string, l: string}[] }) { return <FilterGroup label={label}><select className="w-full bg-white/5 border border-white/10 p-2 text-[10px] font-mono uppercase outline-none focus:border-primary/50" aria-label={label} value={value} onChange={e => onChange(e.target.value)}>{options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}</select></FilterGroup>; }
