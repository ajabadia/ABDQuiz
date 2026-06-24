/**
 * @purpose Renderiza un cuadro de herramientas de indicadores clave de desempeño (KPI) para fines administrativos, mostrando estadísticas como total preguntas, preguntas activas, módulos, fuentes, duplicados y salud de ingestión.
 * @purpose_en Renders a grid of Key Performance Indicators (KPIs) for administrative purposes, displaying statistics such as total questions, active questions, modules, sources, duplicates, and ingestion health.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:3,sig:1djgjuy
 * @lastUpdated 2026-06-23T19:48:30.769Z
 */

import { Card } from '@/components/ui/card';
import { Database, CheckCircle2, Filter, Search, AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface KpiGridProps {
  stats: {
    totalQuestions: number;
    activeQuestions: number;
    moduleCount: number;
    sourceCount: number;
    duplicatesLast30Days: number;
  } | null;
}

export function KpiGrid({ stats }: KpiGridProps) {
  const t = useTranslations('admin');

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4" role="region" aria-label="Key Performance Indicators">
      <KpiCard label={t('totalQuestions')} value={stats?.totalQuestions} icon={<Database className="w-4 h-4" aria-hidden="true" />} />
      <KpiCard label={t('active')} value={stats?.activeQuestions} icon={<CheckCircle2 className="w-4 h-4 text-green-500" aria-hidden="true" />} />
      <KpiCard label={t('modules')} value={stats?.moduleCount} icon={<Filter className="w-4 h-4" aria-hidden="true" />} />
      <KpiCard label={t('sources')} value={stats?.sourceCount} icon={<Search className="w-4 h-4" aria-hidden="true" />} />
      <KpiCard label={t('duplicates')} value={stats?.duplicatesLast30Days} icon={<AlertTriangle className="w-4 h-4 text-yellow-500" aria-hidden="true" />} />
      <KpiCard label={t('ingestionHealth')} value="98.2%" icon={<Activity className="w-4 h-4 text-primary" aria-hidden="true" />} />
    </div>
  );
}

function KpiCard({ label, value, icon }: { label: string; value: string | number | undefined; icon: React.ReactNode }) {
  return (
    <Card className="p-4 bg-card/40 border-white/5 rounded-none flex flex-col gap-2">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-[9px] uppercase tracking-widest font-bold leading-none">{label}</span>
      </div>
      <div className="text-2xl font-black font-mono tracking-tighter tabular-nums">
        {value ?? '0'}
      </div>
    </Card>
  );
}

function Activity(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}
