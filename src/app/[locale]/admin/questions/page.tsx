import { getTranslations } from 'next-intl/server';
import { Separator } from '@/components/ui/separator';
import QuestionsManager from '@/components/admin/QuestionsManager';
import { ensureIndustrialAccess } from '@/lib/session';
import { ArrowLeft, FolderOpen } from 'lucide-react';
import { Link } from '@/i18n/routing';

/**
 * 🛰️ Admin Questions Repository Page (Federated Server Component)
 */
export default async function AdminQuestionsPage() {
  const t = await getTranslations('questions');
  const h = await getTranslations('home');
  const admin = await getTranslations('admin');
  const ap = await getTranslations('adminPortal');

  // 🛡️ Ecosystem Identity Guard
  // Only users authenticated via ABDAuth with ADMIN privileges can enter.
  const user = await ensureIndustrialAccess('ADMIN');

  return (
    <main className="min-h-screen bg-background text-foreground p-6 md:p-12 selection:bg-primary/30" role="main">
      <div className="max-w-7xl mx-auto flex flex-col gap-10">
        
        {/* Header: Variante B */}
        <header className="flex flex-col gap-2 relative">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-4">
              <Link
                href="/admin"
                className="p-2 border border-border bg-card/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-200 cursor-pointer rounded-none"
                aria-label={ap('btnBack')}
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5 font-mono text-[9px] text-primary/80 uppercase tracking-widest">
                  <FolderOpen className="w-3.5 h-3.5 text-primary animate-pulse" />
                  {ap('gobernanza')} • {t('title')}
                </div>
                <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight italic text-foreground leading-none">
                  {t('title')}
                </h1>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t('subtitle')} | Tenant: <span className="text-primary font-bold">{user.tenantId}</span>
          </p>
        </header>

        <QuestionsManager />
        
        <footer className="mt-auto pt-12 flex flex-col items-center gap-6 text-muted-foreground/20 font-mono text-[9px] uppercase tracking-[0.3em]" role="contentinfo">
          <Separator className="bg-border" aria-hidden="true" />
          <span>{admin('brandPart1')}{admin('brandPart2')} {h('version')}</span>
        </footer>
      </div>
    </main>
  );
}
