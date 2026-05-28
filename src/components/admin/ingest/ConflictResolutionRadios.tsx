'use client';

import { useTranslations } from 'next-intl';

interface ConflictResolutionRadiosProps {
  selectedAction: 'keep_both' | 'skip_second' | null;
  onSelectAction: (action: 'keep_both' | 'skip_second') => void;
  questionBPregunta?: string;
}

export function ConflictResolutionRadios({
  selectedAction,
  onSelectAction,
  questionBPregunta,
}: ConflictResolutionRadiosProps) {
  const ap = useTranslations('adminPortal');

  return (
    <div className="space-y-3 border-t border-border pt-3">
      <fieldset>
        <legend className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-3">
          {ap('remediationConflictsActionLabel')}
        </legend>

        <label
          className={`flex items-start gap-3 p-4 border cursor-pointer transition-all group mb-3 ${
            selectedAction === 'keep_both'
              ? 'border-emerald-500/40 bg-emerald-500/5'
              : 'border-border hover:border-emerald-500/30 bg-card/30 hover:bg-emerald-500/5'
          }`}
        >
          <input
            type="radio"
            name="resolveAction"
            value="keep_both"
            checked={selectedAction === 'keep_both'}
            onChange={() => onSelectAction('keep_both')}
            className="mt-0.5 accent-emerald-500 w-4 h-4"
          />
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-foreground group-hover:text-emerald-500 transition-colors">
              {ap('remediationConflictsResolveOptionKeepBoth')}
            </span>
            <p className="text-[9px] text-muted-foreground uppercase leading-relaxed">
              {ap('remediationConflictsResolveOptionKeepBothDesc')}
            </p>
          </div>
        </label>

        <label
          className={`flex items-start gap-3 p-4 border cursor-pointer transition-all group ${
            selectedAction === 'skip_second'
              ? 'border-destructive/40 bg-destructive/5'
              : 'border-border hover:border-destructive/30 bg-card/30 hover:bg-destructive/5'
          }`}
        >
          <input
            type="radio"
            name="resolveAction"
            value="skip_second"
            checked={selectedAction === 'skip_second'}
            onChange={() => onSelectAction('skip_second')}
            className="mt-0.5 accent-destructive w-4 h-4"
          />
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-foreground group-hover:text-destructive transition-colors">
              {ap('remediationConflictsResolveOptionSkipSecond')}
            </span>
            <p className="text-[9px] text-muted-foreground uppercase leading-relaxed">
              {ap('remediationConflictsResolveOptionSkipSecondDesc', { pregunta: questionBPregunta || '' })}
            </p>
          </div>
        </label>
      </fieldset>
    </div>
  );
}
