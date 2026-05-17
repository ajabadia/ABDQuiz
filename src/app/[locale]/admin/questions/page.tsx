import { getTranslations } from 'next-intl/server';
import { Separator } from '@/components/ui/separator';
import QuestionsManager from '@/components/admin/QuestionsManager';
import { ensureIndustrialAccess } from '@/lib/session';

/**
 * 🛰️ Admin Questions Repository Page (Federated Server Component)
 */
export default async function AdminQuestionsPage() {
  const t = await getTranslations('questions');
  const h = await getTranslations('home');
  const admin = await getTranslations('admin');

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

        <QuestionsManager />
        
        <footer className="mt-auto pt-12 flex flex-col items-center gap-6 text-muted-foreground/20 font-mono text-[9px] uppercase tracking-[0.3em]" role="contentinfo">
          <Separator className="w-24 bg-white/5" aria-hidden="true" />
          <span>{admin('brandPart1')}{admin('brandPart2')} {h('version')}</span>
        </footer>
      </div>
    </main>
  );
}
