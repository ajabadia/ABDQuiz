import { getTranslations } from 'next-intl/server';
import { BrainCircuit, Timer, FileCode2, History, ArrowRight, Cpu, Sliders, Database } from 'lucide-react';
import { HeroHeader } from '@abd/styles';
import Link from 'next/link';
import { Footer } from '@abd/styles';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations('common');
  const h = await getTranslations('home');
  
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 md:p-24 bg-background text-foreground selection:bg-primary/30 overflow-hidden" role="main">
      {/* Tactical grid background layer */}
      <div className="absolute inset-0 bg-industrial-grid mask-industrial-fade pointer-events-none opacity-50" aria-hidden="true" />

      <div className="z-10 w-full max-w-5xl flex flex-col gap-16 animate-in fade-in duration-500">
        
        {/* Core Brand Header */}
        <HeroHeader
          statusText={h('status')}
          title={
            <>{t('brandPart1')}<span className="text-primary">{t('brandPart2')}</span></>
          }
          description={h('tagline')}
        />

        {/* Central Tactical Action Area (CTA) */}
        <div className="flex flex-col items-center justify-center gap-4">
          <Link
            href={`/${locale}/exams`}
            className="inline-flex items-center justify-center px-10 py-5 bg-primary text-primary-foreground font-mono text-xs uppercase tracking-widest hover:bg-primary/80 transition-all duration-300 font-black cursor-pointer shadow-lg active:scale-95 border border-primary/30 rounded-lg"
          >
            {t('begin')}
            <ArrowRight className="w-4 h-4 ml-3 animate-pulse" />
          </Link>
          <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-muted-foreground">
            {locale === 'es' 
              ? 'Conexión segura y federada vía ABDAuth' 
              : 'Secure, federated connection powered by ABDAuth'}
          </span>
        </div>

        {/* Tactical Key Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6" role="region" aria-label="System Capabilities">
          
          {/* Feature 1: Execution Engine */}
          <div className="p-6 bg-card border border-border rounded-xl flex flex-col gap-4">
            <div className="p-2.5 bg-secondary/10 border border-border text-primary w-fit rounded-lg">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-black uppercase tracking-wider text-foreground">
              {h('feature1Title')}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {h('feature1Desc')}
            </p>
          </div>

          {/* Feature 2: Scoring Systems */}
          <div className="p-6 bg-card border border-border rounded-xl flex flex-col gap-4">
            <div className="p-2.5 bg-secondary/10 border border-border text-primary w-fit rounded-lg">
              <Sliders className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-black uppercase tracking-wider text-foreground">
              {h('feature2Title')}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {h('feature2Desc')}
            </p>
          </div>

          {/* Feature 3: Security & Deduplication */}
          <div className="p-6 bg-card border border-border rounded-xl flex flex-col gap-4">
            <div className="p-2.5 bg-secondary/10 border border-border text-primary w-fit rounded-lg">
              <Database className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-black uppercase tracking-wider text-foreground">
              {h('feature3Title')}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {h('feature3Desc')}
            </p>
          </div>

        </div>

        {/* Telemetry Footer */}
        <Footer 
          telemetryItems={[
            { label: h('coreLabel'), value: h('version') },
            { label: h('logicLabel'), value: h('engine') },
            { label: h('styleLabel'), value: h('style') }
          ]} 
          separatorWidth="short"
          opacity={20}
        />

      </div>
    </main>
  );
}
