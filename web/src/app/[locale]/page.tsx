import { getTranslations } from 'next-intl/server';
import { Separator } from '@/components/ui/separator';
import { ArrowRight, Cpu, Sliders, Database, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations('common');
  const h = await getTranslations('home');
  
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 md:p-24 bg-background selection:bg-primary/30 overflow-hidden" role="main">
      {/* Tactical grid background layer */}
      <div className="absolute inset-0 bg-industrial-grid mask-industrial-fade pointer-events-none opacity-50" aria-hidden="true" />

      <div className="z-10 w-full max-w-5xl flex flex-col gap-16 animate-in fade-in duration-500">
        
        {/* Core Brand Header */}
        <header className="flex flex-col gap-6 items-center text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-muted/50 border border-border text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-mono">
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            {h('status')}
          </div>
          
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-foreground italic uppercase antialiased">
            {t('brandPart1')}<span className="text-primary/80">{t('brandPart2')}</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-[650px] font-light leading-relaxed font-sans">
            {h('tagline')}
          </p>
        </header>

        {/* Central Tactical Action Area (CTA) */}
        <div className="flex flex-col items-center justify-center gap-4">
          <Link
            href={`/${locale}/exams`}
            className="inline-flex items-center justify-center px-10 py-5 bg-primary text-primary-foreground font-mono text-xs uppercase tracking-widest hover:bg-primary/95 transition-all duration-300 font-black cursor-pointer shadow-lg active:scale-95 border border-primary/30"
          >
            {locale === 'es' ? 'ACCEDER AL SIMULADOR' : 'ACCESS SIMULATOR'}
            <ArrowRight className="w-4 h-4 ml-3 animate-pulse" />
          </Link>
          <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-muted-foreground/60">
            {locale === 'es' 
              ? 'O utiliza el panel de control lateral izquierdo' 
              : 'Or utilize the left control sidebar panel'}
          </span>
        </div>

        {/* Tactical Key Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6" role="region" aria-label="System Capabilities">
          
          {/* Feature 1: Execution Engine */}
          <div className="p-6 bg-card border border-border rounded-none flex flex-col gap-4">
            <div className="p-2.5 bg-primary/5 border border-primary/20 text-primary w-fit">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-black uppercase tracking-wider text-foreground">
              {locale === 'es' ? 'Motores de Simulación' : 'Simulation Engines'}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {locale === 'es'
                ? 'Simulación táctica en tiempo real con lógicas integradas de cronómetro global y temporización específica por pregunta.'
                : 'Real-time tactical simulation with integrated global stopwatch and question-specific countdown logical loops.'}
            </p>
          </div>

          {/* Feature 2: Scoring Systems */}
          <div className="p-6 bg-card border border-border rounded-none flex flex-col gap-4">
            <div className="p-2.5 bg-primary/5 border border-primary/20 text-primary w-fit">
              <Sliders className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-black uppercase tracking-wider text-foreground">
              {locale === 'es' ? 'Lógicas de Evaluación' : 'Evaluation Logic'}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {locale === 'es'
                ? 'Soporte total para esquemas evaluativos simples, penalizados por fallos y con coeficientes de peso por nivel de dificultad.'
                : 'Complete enforcement of simple, incorrect-penalty, and weighted difficulty coefficient evaluation schemes.'}
            </p>
          </div>

          {/* Feature 3: Security & Deduplication */}
          <div className="p-6 bg-card border border-border rounded-none flex flex-col gap-4">
            <div className="p-2.5 bg-primary/5 border border-primary/20 text-primary w-fit">
              <Database className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-black uppercase tracking-wider text-foreground">
              {locale === 'es' ? 'Integridad del Corpus' : 'Corpus Integrity'}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {locale === 'es'
                ? 'Validación Zod estricta de esquemas de datos y deduplicación por hashes SHA-256 para preservar la pureza del banco.'
                : 'Strict Zod validation of content schemas and batch deduplication via SHA-256 hashes to preserve corpus purity.'}
            </p>
          </div>

        </div>

        {/* Telemetry Footer */}
        <footer className="flex flex-col items-center gap-6 text-muted-foreground/30 font-mono text-[9px] uppercase tracking-[0.3em] pt-8" role="contentinfo">
          <Separator className="w-24 bg-border" aria-hidden="true" />
          <div className="flex gap-12">
            <span>{h('coreLabel')}: {h('version')}</span>
            <span>{h('logicLabel')}: {h('engine')}</span>
            <span>{h('styleLabel')}: {h('style')}</span>
          </div>
        </footer>

      </div>
    </main>
  );
}
