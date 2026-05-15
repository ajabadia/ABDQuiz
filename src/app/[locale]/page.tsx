import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/card';
import { startQuizAction } from '@/actions/quiz';
import { Separator } from '@/components/ui/separator';

export default function HomePage() {
  const t = useTranslations('common');
  const h = useTranslations('home');

  // Usamos bind para pasar argumentos a las Server Actions de forma serializable
  const startTraining = startQuizAction.bind(null, 'training');
  const startMock = startQuizAction.bind(null, 'mock');

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 md:p-24 bg-background selection:bg-primary/30 overflow-hidden" role="main">
      {/* Background Decorator - Using centralized patterns */}
      <div className="absolute inset-0 bg-industrial-grid mask-industrial-fade pointer-events-none opacity-50" aria-hidden="true" />

      <div className="z-10 w-full max-w-4xl flex flex-col gap-12">
        <header className="flex flex-col gap-4 items-center text-center">
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
          <p className="text-xl text-muted-foreground max-w-[600px] font-light leading-relaxed font-sans">
            {h('tagline')}
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8" role="region" aria-label="Simulation Modes">
          {/* Training Mode Card */}
          <Card className="group relative p-8 bg-card/40 border-white/5 hover:border-primary/40 transition-all duration-500 overflow-hidden backdrop-blur-sm rounded-none">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity font-mono text-7xl font-black" aria-hidden="true">01</div>
            <h3 className="text-2xl font-bold mb-3 uppercase tracking-tight">{t('trainingMode')}</h3>
            <p className="text-sm text-muted-foreground mb-10 leading-relaxed min-h-[60px]">
              {h('trainingDesc')}
            </p>
            <form action={startTraining}>
              <button className="btn-primary-console w-full h-14" aria-label={`${t('trainingMode')}: ${h('launchSession')}`}>
                {h('launchSession')}
              </button>
            </form>
          </Card>

          {/* Mock Mode Card */}
          <Card className="group relative p-8 bg-card/40 border-white/5 hover:border-saltar/40 transition-all duration-500 overflow-hidden backdrop-blur-sm rounded-none">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity font-mono text-7xl font-black" aria-hidden="true">02</div>
            <h3 className="text-2xl font-bold mb-3 uppercase tracking-tight">{t('mockMode')}</h3>
            <p className="text-sm text-muted-foreground mb-10 leading-relaxed min-h-[60px]">
              {h('mockDesc')}
            </p>
            <form action={startMock}>
              <button className="btn-skip-console w-full h-14" aria-label={`${t('mockMode')}: ${h('beginMock')}`}>
                {h('beginMock')}
              </button>
            </form>
          </Card>
        </div>

        <footer className="flex flex-col items-center gap-6 text-muted-foreground/30 font-mono text-[9px] uppercase tracking-[0.3em] pt-8" role="contentinfo">
          <Separator className="w-24 bg-white/10" aria-hidden="true" />
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
