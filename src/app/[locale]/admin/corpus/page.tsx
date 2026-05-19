import { getTranslations } from 'next-intl/server';
import { Separator } from '@/components/ui/separator';
import CorpusDashboard from '@/components/admin/CorpusDashboard';
import { ensureIndustrialAccess } from '@/lib/session';
import { ArrowLeft, FolderOpen } from 'lucide-react';
import { Link } from '@/i18n/routing';

/**
 * 🛰️ Admin Corpus Page (Federated Server Component)
 */
export default async function AdminCorpusPage() {
  const t = await getTranslations('admin');
  const h = await getTranslations('home');
  const ap = await getTranslations('adminPortal');

  // 🛡️ Ecosystem Identity Guard
  // Only users authenticated via ABDAuth with ADMIN privileges can enter.
  const user = await ensureIndustrialAccess('ADMIN');

  return (
    <main className="min-h-screen bg-background text-foreground p-6 md:p-12 selection:bg-primary/30" role="main">
      <div className="max-w-7xl mx-auto flex flex-col gap-10">
        
        {/* Header Navigation */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border pb-8">
          <div className="flex flex-col gap-2">
            <div className="text-[10px] font-mono font-black uppercase tracking-[0.25em] text-primary flex items-center gap-2 mb-2">
              <FolderOpen size={14} className="text-primary animate-pulse" aria-hidden="true" />
              {ap('gobernanza')} • {t('title')}
            </div>
            
            <div className="flex items-center gap-4 mt-1">
              <Link 
                href="/admin"
                className="inline-flex items-center justify-center p-2 bg-transparent text-muted-foreground hover:text-foreground border border-border hover:border-border/80 transition-all duration-200 cursor-pointer rounded-none active:scale-[0.95] shrink-0 focus:outline-none focus:ring-1 focus:ring-primary/50"
                aria-label={ap('btnBack')}
                title="Back to Dashboard"
              >
                <ArrowLeft size={14} aria-hidden="true" />
              </Link>
              
              <h1 className="text-3xl font-black uppercase italic tracking-tight text-foreground leading-none flex-1 truncate">
                {t('title')}
              </h1>
            </div>
            
            <p className="text-sm text-muted-foreground font-sans mt-2 leading-relaxed">
              {t('subtitle')} | Tenant: <span className="text-primary font-bold">{user.tenantId}</span>
            </p>
          </div>
        </header>

        <CorpusDashboard tenantId={user.tenantId} />
        
        <footer className="mt-auto pt-12 flex flex-col items-center gap-6 text-muted-foreground/20 font-mono text-[9px] uppercase tracking-[0.3em]" role="contentinfo">
          <Separator className="bg-border" aria-hidden="true" />
          <span>{t('brandPart1')}{t('brandPart2')} {h('version')}</span>
        </footer>
      </div>
    </main>
  );
}
