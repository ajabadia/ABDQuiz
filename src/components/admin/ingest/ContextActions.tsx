'use client';

import { Upload, SkipForward } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface ContextActionsProps {
  skipMode: boolean;
  canApply: boolean;
  onApply: () => void;
  onSkip: () => void;
  onBack: () => void;
  onToggleSkip: () => void;
}

export function ContextActions({
  skipMode,
  canApply,
  onApply,
  onSkip,
  onBack,
  onToggleSkip,
}: ContextActionsProps) {
  const ap = useTranslations('adminPortal');

  return (
    <>
      <div className="flex gap-4 mt-4 border-t border-border pt-4">
        <button
          type="button"
          onClick={onBack}
          aria-label={ap('btnBack')}
          className="w-1/4 border border-border hover:bg-muted text-[10px] uppercase font-bold tracking-widest font-mono h-12"
        >
          {ap('btnBack')}
        </button>
        {!skipMode ? (
          <button
            type="button"
            onClick={onApply}
            disabled={!canApply}
            aria-label={ap('selectContextApply')}
            className="btn-primary-console flex-1 h-12 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload className="w-4 h-4" />
            {ap('selectContextApply')}
          </button>
        ) : (
          <button
            type="button"
            onClick={onSkip}
            aria-label={ap('selectContextSkip')}
            className="btn-skip-console flex-1 h-12 flex items-center justify-center gap-2"
          >
            <SkipForward className="w-4 h-4" />
            {ap('selectContextSkip')}
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={onToggleSkip}
        aria-label={skipMode ? ap('selectContextBackToSelection') : ap('selectContextSkip')}
        className="text-[9px] font-mono text-muted-foreground hover:text-warning uppercase tracking-wider underline underline-offset-4 transition-colors text-center"
      >
        {skipMode ? ap('selectContextBackToSelection') : ap('selectContextSkip')}
      </button>
    </>
  );
}
