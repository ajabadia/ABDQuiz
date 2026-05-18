import { getTranslations } from 'next-intl/server';
import { Separator } from '@/components/ui/separator';
import { ensureIndustrialAccess } from '@/lib/session';
import { getAttemptsAction } from '@/actions/quiz';
import AttemptsManager from '@/components/admin/AttemptsManager';
import { ArrowLeft, FolderOpen } from 'lucide-react';
import { Link } from '@/i18n/routing';

export default async function AdminAttemptsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations('admin');
  const h = await getTranslations('home');
  const ap = await getTranslations('adminPortal');
  
  // 🛡️ Identity & Ecosystem Security Guard
  const user = await ensureIndustrialAccess('ADMIN');
  
  const attempts = await getAttemptsAction();

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
                  {ap('gobernanza')} • Control de Intentos
                </div>
                <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight italic text-foreground leading-none">
                  Control de Intentos
                </h1>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Historial del Tenant: <span className="text-primary font-bold">{user.tenantId}</span> — Anulación y concesión de reintentos extraordinarios.
          </p>
        </header>

        <AttemptsManager attempts={attempts} />
        
        <footer className="mt-auto pt-12 flex flex-col items-center gap-6 text-muted-foreground/20 font-mono text-[9px] uppercase tracking-[0.3em]" role="contentinfo">
          <Separator className="bg-border" aria-hidden="true" />
          <span>{t('brandPart1')}{t('brandPart2')} {h('version')}</span>
        </footer>
      </div>
    </main>
  );
}
