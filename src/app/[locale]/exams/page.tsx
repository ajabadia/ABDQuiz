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
        
        {/* Header Navigation */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border pb-8">
          <div className="flex flex-col gap-2">
            <div className="text-[10px] font-mono font-black uppercase tracking-[0.25em] text-primary flex items-center gap-2 mb-2">
              <FolderOpen size={14} className="text-primary animate-pulse" aria-hidden="true" />
              {t('appTitle')} • {h('launchConsole')}
            </div>
            
            <div className="flex items-center gap-4 mt-1">
              <Link 
                href="/"
                className="inline-flex items-center justify-center p-2 bg-transparent text-muted-foreground hover:text-foreground border border-border hover:border-border/80 transition-all duration-200 cursor-pointer rounded-none active:scale-[0.95] shrink-0 focus:outline-none focus:ring-1 focus:ring-primary/50"
                aria-label={results('backHome')}
                title="Back to Home"
              >
                <ArrowLeft size={14} aria-hidden="true" />
              </Link>
              
              <h1 className="text-3xl font-black uppercase italic tracking-tight text-foreground leading-none flex-1 truncate">
                {h('simulationTemplates')}
              </h1>
            </div>
            
            <p className="text-sm text-muted-foreground font-sans mt-2 leading-relaxed">
              {h('examsDescription')}
            </p>
          </div>
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
