import { getTranslations } from 'next-intl/server';
import { Card } from '@/components/ui/card';
import { startQuizAction } from '@/actions/quiz';
import { getExamConfigsAction } from '@/actions/examConfig';
import { type SerializedExamConfig } from '@/types/quiz';
import { HeroHeader } from '@ajabadia/styles';
import { GlobalFooter } from '@ajabadia/ecosystem-widgets';

export default async function ExaminarPage() {
  const t = await getTranslations('common');
  const h = await getTranslations('home');
  
  // Fetch active configurations
  const configs: SerializedExamConfig[] = await getExamConfigsAction();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 md:p-24 bg-background selection:bg-primary/30 overflow-hidden" role="main">
      <div className="absolute inset-0 bg-industrial-grid mask-industrial-fade pointer-events-none opacity-50" aria-hidden="true" />

      <div className="z-10 w-full max-w-5xl flex flex-col gap-12 animate-in fade-in duration-500">
        <HeroHeader
          statusText={h('status')}
          title={
            <>{t('brandPart1')}<span className="text-primary/80">{t('brandPart2')}</span></>
          }
          description={t('subtitle')}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8" role="region" aria-label="Simulation Modes">
          {configs.map((config, index) => {
            const launchAction = startQuizAction.bind(null, config._id);
            const isEven = index % 2 === 0;
            return (
              <Card key={config._id} className={`group relative p-8 bg-card/40 border-white/5 hover:border-${isEven ? 'primary' : 'saltar'}/40 transition-all duration-500 overflow-hidden backdrop-blur-sm rounded-none flex flex-col justify-between min-h-[300px]`}>
                <div>
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity font-mono text-7xl font-black" aria-hidden="true">
                    {String(index + 1).padStart(2, '0')}
                  </div>
                  <h3 className="text-2xl font-bold mb-3 uppercase tracking-tight">{config.name}</h3>
                  <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                    {config.description}
                  </p>
                </div>
                
                <div>
                  <div className="flex gap-4 mb-6 text-[9px] font-mono uppercase text-muted-foreground/50 border-t border-white/5 pt-4">
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

        <GlobalFooter 
          separatorWidth="short"
          telemetryItems={[
            { label: h('coreLabel'), value: h('version') },
            { label: h('logicLabel'), value: h('engine') },
            { label: h('styleLabel'), value: h('style') }
          ]}
        />
      </div>
    </main>
  );
}
