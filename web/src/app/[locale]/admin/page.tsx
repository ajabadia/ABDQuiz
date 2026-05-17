import { getTranslations } from 'next-intl/server';
import { Separator } from '@/components/ui/separator';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ensureIndustrialAccess } from '@/lib/session';
import { 
  Settings, 
  Database, 
  Sliders, 
  ShieldCheck, 
  ArrowRight, 
  LogOut, 
  LayoutDashboard,
  Terminal,
  FileSpreadsheet
} from 'lucide-react';
import Link from 'next/link';

/**
 * 🛰️ Central Admin Governance Portal Page (Federated Server Component)
 */
export default async function AdminPortalPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations('admin');
  const h = await getTranslations('home');
  const c = await getTranslations('common');
  const ap = await getTranslations('adminPortal');

  // 🛡️ Ecosystem Identity Guard
  // Only users authenticated via ABDAuth with ADMIN privileges can enter.
  const user = await ensureIndustrialAccess('ADMIN');

  return (
    <main className="min-h-screen bg-background text-foreground p-6 md:p-12 selection:bg-primary/30" role="main">
      <div className="max-w-7xl mx-auto flex flex-col gap-10">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/10 pb-8">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-4">
              <LayoutDashboard className="w-8 h-8 text-primary" aria-hidden="true" />
              <h1 className="text-4xl font-black tracking-tighter uppercase italic">
                {t('title').split(' ')[0]} <span className="text-primary/80">{ap('gobernanza')}</span>
              </h1>
            </div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground font-mono ml-12">
              {ap('subTitle')}<span className="text-primary">{user.tenantId}</span>
            </p>
          </div>

          <Button variant="outline" className="rounded-none font-mono text-[10px] tracking-widest uppercase h-10 border-white/10 hover:bg-white/5 text-muted-foreground hover:text-foreground" asChild>
            <Link href={`/${locale}`}>
              <LogOut className="w-4 h-4 mr-2" />
              {c('close')}
            </Link>
          </Button>
        </header>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Controls Column (2/3 width) */}
          <div className="lg:col-span-2 flex flex-col gap-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Card 1: Question Ingestor */}
              <Card className="p-8 bg-card/30 border-white/5 rounded-none flex flex-col justify-between min-h-[320px] transition-all hover:border-primary/20 hover:bg-card/40 group">
                <div className="flex flex-col gap-6">
                  <div className="flex items-center justify-between">
                    <div className="p-3 bg-white/[0.02] border border-white/5 group-hover:border-primary/30 group-hover:bg-primary/5 transition-all">
                      <Database className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground bg-white/5 px-2.5 py-1">{ap('bancoDatos')}</span>
                  </div>

                  <div className="flex flex-col gap-2">
                    <h2 className="text-xl font-bold uppercase tracking-tight italic text-foreground group-hover:text-primary transition-colors">
                      {t('title')}
                    </h2>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {t('subtitle')} {ap('ingestorDesc')}
                    </p>
                  </div>
                </div>

                <div className="mt-8 flex flex-col gap-4">
                  <Separator className="bg-white/5" />
                  <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                    <span>{ap('deduplicacion')}</span>
                    <span className="text-primary font-bold">{ap('activo')}</span>
                  </div>
                  <Button className="rounded-none font-mono text-[10px] tracking-widest uppercase h-12 w-full mt-2" asChild>
                    <Link href={`/${locale}/admin/corpus`}>
                      {ap('ingresarIngestador')}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                </div>
              </Card>

              {/* Card 2: Exam Parametrization */}
              <Card className="p-8 bg-card/30 border-white/5 rounded-none flex flex-col justify-between min-h-[320px] transition-all hover:border-primary/20 hover:bg-card/40 group">
                <div className="flex flex-col gap-6">
                  <div className="flex items-center justify-between">
                    <div className="p-3 bg-white/[0.02] border border-white/5 group-hover:border-primary/30 group-hover:bg-primary/5 transition-all">
                      <Sliders className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground bg-white/5 px-2.5 py-1">{ap('algoritmos')}</span>
                  </div>

                  <div className="flex flex-col gap-2">
                    <h2 className="text-xl font-bold uppercase tracking-tight italic text-foreground group-hover:text-primary transition-colors">
                      {t('examsTitle')}
                    </h2>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {t('examsSubtitle')} {ap('examsDesc')}
                    </p>
                  </div>
                </div>

                <div className="mt-8 flex flex-col gap-4">
                  <Separator className="bg-white/5" />
                  <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                    <span>{ap('evaluacionPond')}</span>
                    <span className="text-primary font-bold">{ap('soportado')}</span>
                  </div>
                  <Button className="rounded-none font-mono text-[10px] tracking-widest uppercase h-12 w-full mt-2" asChild>
                    <Link href={`/${locale}/admin/exams`}>
                      {ap('ingresarParametrizar')}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                </div>
              </Card>

            </div>
          </div>

          {/* System Telemetry Sidebar (1/3 width) */}
          <Card className="p-8 bg-card/10 border-white/5 rounded-none flex flex-col gap-6 h-fit">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-primary" aria-hidden="true" />
              <h2 className="text-sm font-bold uppercase tracking-widest font-mono text-foreground">{ap('seguridadNucleo')}</h2>
            </div>
            
            <Separator className="bg-white/5" aria-hidden="true" />

            <div className="flex flex-col gap-4 font-mono text-[10px] uppercase">
              <div className="flex justify-between items-center py-1">
                <span className="text-muted-foreground tracking-wider">{ap('autoridad')}</span>
                <span className="text-foreground font-bold">{t('superuser')}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-t border-white/5">
                <span className="text-muted-foreground tracking-wider">{ap('protocolo')}</span>
                <span className="text-foreground font-bold">{t('protocol')}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-t border-white/5">
                <span className="text-muted-foreground tracking-wider">{ap('modoRegional')}</span>
                <span className="text-foreground font-bold">{locale.toUpperCase()}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-t border-white/5">
                <span className="text-foreground tracking-wider font-bold">{ap('estadoAuditoria')}</span>
                <span className="text-primary font-black animate-pulse">{ap('certificadoOk')}</span>
              </div>
            </div>

            <Separator className="bg-white/5" aria-hidden="true" />
            
            <div className="p-4 bg-white/[0.02] border border-white/5 flex flex-col gap-2 rounded-none">
              <div className="flex items-center gap-2 text-[9px] font-mono font-bold tracking-widest text-primary uppercase">
                <Terminal className="w-3.5 h-3.5" />
                {ap('conexionCentral')}
              </div>
              <p className="text-[9px] text-muted-foreground uppercase leading-relaxed font-mono">
                {ap('conexionCentralDesc')}
              </p>
            </div>
          </Card>

        </div>

        {/* Footer */}
        <footer className="mt-auto pt-12 flex flex-col items-center gap-6 text-muted-foreground/20 font-mono text-[9px] uppercase tracking-[0.3em]" role="contentinfo">
          <Separator className="bg-white/5" aria-hidden="true" />
          <span>{t('brandPart1')}{t('brandPart2')} {h('version')}</span>
        </footer>

      </div>
    </main>
  );
}
