'use client';

import { AlertTriangle, Sliders, ArrowRight, ShieldAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface RemediationChoiceStateProps {
  countIncomplete: number;
  totalCount: number;
  onBulkChoice: () => void;
  onInteractiveChoice: () => void;
  onIgnoreChoice: () => void;
}

export function RemediationChoiceState({
  countIncomplete,
  totalCount,
  onBulkChoice,
  onInteractiveChoice,
  onIgnoreChoice
}: RemediationChoiceStateProps) {
  const ap = useTranslations('adminPortal');

  return (
    <div className="flex flex-col gap-6 animate-in fade-in">
      <div className="space-y-2">
        <div className="flex items-center gap-3 text-warning">
          <AlertTriangle className="w-6 h-6 animate-pulse" />
          <h2 className="text-lg font-black uppercase tracking-tight italic">
            {ap('remediationTitle')}
          </h2>
        </div>
        <p className="text-xs text-muted-foreground uppercase leading-relaxed font-mono">
          {ap('remediationSubtitle', { count: countIncomplete, total: totalCount })}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        
        {/* Option A: Apply to all */}
        <div 
          onClick={onBulkChoice}
          onKeyDown={(e) => e.key === 'Enter' && onBulkChoice()}
          role="button"
          tabIndex={0}
          aria-label={ap('remedOption1')}
          className="p-5 border border-border hover:border-primary/30 bg-card/30 hover:bg-primary/5 cursor-pointer transition-all flex items-start gap-4 group focus:outline-none focus:ring-1 focus:ring-primary/30"
        >
          <div className="p-2.5 bg-muted border border-border group-hover:border-primary/20 transition-all">
            <Sliders className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground group-hover:text-primary transition-colors">
              {ap('remedOption1')}
            </h4>
            <p className="text-[10px] text-muted-foreground uppercase leading-normal">
              {ap('remedOption1Desc')}
            </p>
          </div>
        </div>

        {/* Option B: Question by question */}
        <div 
          onClick={onInteractiveChoice}
          onKeyDown={(e) => e.key === 'Enter' && onInteractiveChoice()}
          role="button"
          tabIndex={0}
          aria-label={ap('remedOption2')}
          className="p-5 border border-border hover:border-primary/30 bg-card/30 hover:bg-primary/5 cursor-pointer transition-all flex items-start gap-4 group focus:outline-none focus:ring-1 focus:ring-primary/30"
        >
          <div className="p-2.5 bg-muted border border-border group-hover:border-primary/20 transition-all">
            <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground group-hover:text-primary transition-colors">
              {ap('remedOption2')}
            </h4>
            <p className="text-[10px] text-muted-foreground uppercase leading-normal">
              {ap('remedOption2Desc')}
            </p>
          </div>
        </div>

        {/* Option C: Keep defaults */}
        <div 
          onClick={onIgnoreChoice}
          onKeyDown={(e) => e.key === 'Enter' && onIgnoreChoice()}
          role="button"
          tabIndex={0}
          aria-label={ap('remedOption3')}
          className="p-5 border border-border hover:border-destructive/30 bg-card/30 hover:bg-destructive/5 cursor-pointer transition-all flex items-start gap-4 group focus:outline-none focus:ring-1 focus:ring-destructive/30"
        >
          <div className="p-2.5 bg-muted border border-border group-hover:border-destructive/20 transition-all">
            <ShieldAlert className="w-5 h-5 text-muted-foreground group-hover:text-destructive transition-colors" />
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground group-hover:text-destructive transition-colors">
              {ap('remedOption3')}
            </h4>
            <p className="text-[10px] text-muted-foreground uppercase leading-normal">
              {ap('remedOption3Desc')}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
