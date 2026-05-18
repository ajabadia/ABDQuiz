import { getTranslations } from 'next-intl/server';
import { Card } from '@/components/ui/card';
import { startQuizAction } from '@/actions/quiz';
import { Separator } from '@/components/ui/separator';
import { getExamConfigsAction } from '@/actions/examConfig';
import { type SerializedExamConfig } from '@/types/quiz';
import { ArrowLeft, FolderOpen } from 'lucide-react';
import { Link } from '@/i18n/routing';

export default async function ExamsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations('common');
  const h = await getTranslations('home');
  const results = await getTranslations('results');
  
  // Fetch active configurations from database
  const configs: SerializedExamConfig[] = await getExamConfigsAction();

  return (
    <main className="min-h-screen bg-background text-foreground p-6 md:p-12 selection:bg-primary/30" role="main">
      {/* Tactical grid background layer */}
      <div className="absolute inset-0 bg-industrial-grid mask-industrial-fade pointer-events-none opacity-50" aria-hidden="true" />

      <div className="max-w-7xl mx-auto flex flex-col gap-10 z-10 relative">
        
        {/* Header: Variante B */}
        <header className="flex flex-col gap-2 relative">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="p-2 border border-border bg-card/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-200 cursor-pointer rounded-none"
                aria-label={results('backHome')}
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5 font-mono text-[9px] text-primary/80 uppercase tracking-widest">
                  <FolderOpen className="w-3.5 h-3.5 text-primary animate-pulse" />
                  {t('appTitle')} • {h('launchConsole')}
                </div>
                <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight italic text-foreground leading-none">
                  {h('simulationTemplates')}
                </h1>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {h('examsDescription')}
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
