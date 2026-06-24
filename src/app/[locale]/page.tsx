/**
 * @purpose Renderiza la página principal del aplicativo ABDQuiz, incluyendo un encabezado heroico, botones CTA y información de versión.
 * @purpose_en Renders the home page of the ABDQuiz application, including a hero header, CTA buttons, and version information.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:5,sig:1uz6jn8
 * @lastUpdated 2026-06-23T16:50:14.124Z
 */

import { getTranslations } from 'next-intl/server';
import { BrainCircuit, Timer, FileCode2, History, ArrowRight } from 'lucide-react';
import { HeroHeader } from '@ajabadia/styles';
import Link from 'next/link';
import { GlobalFooter } from '@ajabadia/ecosystem-widgets';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations('common');
  const h = await getTranslations('home');
  
  return (
    <>
      {/* Core Brand Header — top-level banner landmark, outside <main> */}
      <div className="w-full p-6 md:p-24 pb-0">
        <HeroHeader
          statusText={h('status')}
          title={
            <>{t('brandPart1')}<span className="text-primary">{t('brandPart2')}</span></>
          }
          description={h('tagline')}
        />
      </div>

      <main className="flex min-h-screen flex-col items-center justify-center p-6 md:p-24 bg-background text-foreground selection:bg-primary/30 overflow-hidden" role="main">
        {/* Tactical grid background layer */}
        <div className="absolute inset-0 bg-industrial-grid mask-industrial-fade pointer-events-none opacity-50" aria-hidden="true" />

        <div className="z-10 w-full max-w-5xl flex flex-col gap-16 animate-in fade-in duration-500">
          
          {/* Central Tactical Action Area (CTA) */}
          <div className="flex flex-col items-center justify-center gap-4">
            <Link
              href={`/${locale}/examinar`}
              className="inline-flex items-center justify-center px-10 py-5 bg-primary text-primary-foreground font-mono text-xs uppercase tracking-widest hover:bg-primary/80 transition-all duration-300 font-black cursor-pointer shadow-lg active:scale-95 border border-primary/30 rounded-lg"
            >
              {h('accessSimulator')}
              <ArrowRight className="w-4 h-4 ml-3 animate-pulse" />
            </Link>
            <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-muted-foreground">
              {locale === 'es' 
                ? 'Inicie sesión con sus credenciales federadas de ABDAuth' 
                : 'Sign in utilizing your federated credentials from ABDAuth'}
            </span>
          </div>

          {/* Tactical Key Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6" role="region" aria-label="System Capabilities">
            
            {/* Feature 1 */}
            <div className="p-6 bg-card border border-border rounded-xl flex flex-col gap-4">
              <div className="p-2.5 bg-secondary/10 border border-border text-primary w-fit rounded-lg">
                <Timer className="w-5 h-5" aria-hidden="true" />
              </div>
              <h2 className="text-sm font-black uppercase tracking-wider text-foreground">
                {h('feature1Title')}
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {h('feature1Desc')}
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 bg-card border border-border rounded-xl flex flex-col gap-4">
              <div className="p-2.5 bg-secondary/10 border border-border text-primary w-fit rounded-lg">
                <BrainCircuit className="w-5 h-5" aria-hidden="true" />
              </div>
              <h2 className="text-sm font-black uppercase tracking-wider text-foreground">
                {h('feature2Title')}
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {h('feature2Desc')}
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 bg-card border border-border rounded-xl flex flex-col gap-4">
              <div className="p-2.5 bg-secondary/10 border border-border text-primary w-fit rounded-lg">
                <FileCode2 className="w-5 h-5" aria-hidden="true" />
              </div>
              <h2 className="text-sm font-black uppercase tracking-wider text-foreground">
                {h('feature3Title')}
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {h('feature3Desc')}
              </p>
            </div>

          </div>

        </div>
      </main>

      <div className="mt-auto pt-12 flex flex-col items-center gap-6">
        {/* Separator line */}
        <div className="h-[1px] bg-border/40 w-24 mx-auto" aria-hidden="true" />
        {/* Version info — rendered manually to ensure proper color contrast */}
        <footer className="font-mono text-[9px] uppercase tracking-[0.3em] text-foreground/70" role="contentinfo">
          <div className="flex flex-wrap justify-center gap-x-12 gap-y-2">
            <span>{h('coreLabel')}: {h('version')}</span>
            <span>{h('logicLabel')}: {h('engine')}</span>
            <span>{h('styleLabel')}: {h('style')}</span>
          </div>
        </footer>
      </div>
    </>
  );
}

