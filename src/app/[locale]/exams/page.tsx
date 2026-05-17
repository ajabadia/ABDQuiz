import { getTranslations } from 'next-intl/server';
import { Card } from '@/components/ui/card';
import { startQuizAction } from '@/actions/quiz';
import { Separator } from '@/components/ui/separator';
import { getExamConfigsAction } from '@/actions/examConfig';
import { type SerializedExamConfig } from '@/types/quiz';

export default async function ExamsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations('common');
  const h = await getTranslations('home');
  
  // Fetch active configurations from database
  const configs: SerializedExamConfig[] = await getExamConfigsAction();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 md:p-24 bg-background selection:bg-primary/30 overflow-hidden" role="main">
      {/* Tactical grid background layer */}
      <div className="absolute inset-0 bg-industrial-grid mask-industrial-fade pointer-events-none opacity-50" aria-hidden="true" />

      <div className="z-10 w-full max-w-5xl flex flex-col gap-12 animate-in fade-in duration-500">
        
        {/* Streamlined Launch Header */}
        <header className="flex flex-col gap-3 items-center text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-muted/50 border border-border text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-mono">
            {locale === 'es' ? 'CONSOLA DE LANZAMIENTO' : 'LAUNCH CONSOLE'}
          </div>
          
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-foreground italic uppercase antialiased">
            {locale === 'es' ? 'PLANTILLAS DE SIMULACIÓN' : 'SIMULATION TEMPLATES'}
          </h1>
          
          <p className="text-sm text-muted-foreground max-w-[600px] leading-relaxed font-sans font-light">
            {locale === 'es'
              ? 'Selecciona una plantilla de simulación para iniciar la evaluación técnica. Las condiciones temporales y de puntuación se aplicarán automáticamente.'
              : 'Select a simulation template to begin your technical evaluation. All timing and scoring parameters will be enforced automatically.'}
          </p>
        </header>

        {/* Exams Launch Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8" role="region" aria-label="Simulation Modes">
          {configs.map((config, index) => {
            const launchAction = startQuizAction.bind(null, config._id);
            const isEven = index % 2 === 0;
            return (
              <Card key={config._id} className="group relative p-8 bg-card border border-border hover:border-primary/40 transition-all duration-500 overflow-hidden backdrop-blur-sm rounded-none flex flex-col justify-between min-h-[300px]">
                <div>
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity font-mono text-7xl font-black animate-pulse" aria-hidden="true">
                    {String(index + 1).padStart(2, '0')}
                  </div>
                  <h3 className="text-2xl font-bold mb-3 uppercase tracking-tight text-foreground">{config.name}</h3>
                  <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                    {config.description}
                  </p>
                </div>
                
                <div>
                  <div className="flex gap-4 mb-6 text-[9px] font-mono uppercase text-muted-foreground/50 border-t border-border pt-4">
                    <span>{config.questionCount} Qs</span>
                    <span>•</span>
                    <span>{config.globalTimeLimitSeconds ? `${config.globalTimeLimitSeconds / 60} min` : '∞'}</span>
                    <span>•</span>
                    <span className="text-primary">{config.scoringMode}</span>
                  </div>
                  
                  <form action={launchAction}>
                    <button className={isEven ? "btn-primary-console w-full h-14 cursor-pointer" : "btn-skip-console w-full h-14 cursor-pointer"} aria-label={config.name}>
                      {t('launch')}
                    </button>
                  </form>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Footer */}
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
