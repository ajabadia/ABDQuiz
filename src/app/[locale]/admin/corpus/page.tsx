import { getTranslations } from 'next-intl/server';
import { Separator } from '@/components/ui/separator';
import CorpusDashboard from '@/components/admin/CorpusDashboard';
import { ensureIndustrialAccess } from '@/lib/session';

/**
 * 🛰️ Admin Corpus Page (Federated Server Component)
 */
export default async function AdminCorpusPage() {
  const t = await getTranslations('admin');
  const h = await getTranslations('home');

  // 🛡️ Ecosystem Identity Guard
  // Only users authenticated via ABDAuth with ADMIN privileges can enter.
  const user = await ensureIndustrialAccess('ADMIN');

  return (
    <main className="min-h-screen bg-background text-foreground p-6 md:p-12 selection:bg-primary/30" role="main">
      <div className="max-w-7xl mx-auto flex flex-col gap-10">
        <header className="flex flex-col gap-2">
          <div className="flex items-center gap-4">
            <div className="h-10 w-1 bg-primary" aria-hidden="true" />
            <h1 className="text-4xl font-black tracking-tighter uppercase italic">
              {t('title').split(' ')[0]} <span className="text-primary/80">{t('title').split(' ').slice(1).join(' ')}</span>
            </h1>
          </div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground font-mono ml-5">
            {t('subtitle')} | Tenant: <span className="text-primary">{user.tenantId}</span>
          </p>
        </header>

        <CorpusDashboard tenantId={user.tenantId} />
        
        <footer className="mt-auto pt-12 flex flex-col items-center gap-6 text-muted-foreground/20 font-mono text-[9px] uppercase tracking-[0.3em]" role="contentinfo">
          <Separator className="w-24 bg-white/5" aria-hidden="true" />
          <span>{t('brandPart1')}{t('brandPart2')} {h('version')}</span>
        </footer>
      </div>
    </main>
  );
}
