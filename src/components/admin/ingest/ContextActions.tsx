'use client';

/**
 * @purpose Gestiona un conjunto de botones para administrar acciones de contexto en una interfaz de administración, incluyendo aplicar cambios, saltar pasos y activar modo de salto.
 * @purpose_en Renders a set of buttons for managing context actions in an admin interface, including applying changes, skipping steps, and toggling skip mode.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:2,sig:1b8s5uz
 * @lastUpdated 2026-06-23T17:41:23.164Z
 */

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
