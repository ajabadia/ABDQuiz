'use client';

/**
 * @purpose Renderiza una pantalla de finalización con un icono, título, descripción y botones de acción.
 * @purpose_en Renders a completion screen with an icon, title, description, and action buttons.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:1,sig:jbvfey
 * @lastUpdated 2026-06-23T17:42:33.013Z
 */

import { Check } from 'lucide-react';

interface RemediationCompleteProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  onBack?: () => void;
  backLabel?: string;
}

export function RemediationComplete({
  title,
  description,
  actionLabel,
  onAction,
  onBack,
  backLabel,
}: RemediationCompleteProps) {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in items-center justify-center py-12">
      <div className="p-4 bg-emerald-500/10 border border-emerald-500/20">
        <Check className="w-10 h-10 text-emerald-500" />
      </div>
      <div className="text-center space-y-2">
        <h2 className="text-lg font-black uppercase tracking-tight italic text-emerald-500">
          {title}
        </h2>
        <p className="text-xs text-muted-foreground uppercase leading-relaxed font-mono">
          {description}
        </p>
      </div>

      <div className="flex gap-4 border-t border-border pt-4 w-full max-w-md justify-center">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label={backLabel || 'Atrás'}
            className="border border-border hover:bg-muted text-[10px] uppercase font-bold tracking-widest font-mono h-12 px-6"
          >
            {backLabel}
          </button>
        )}
        <button
          type="button"
          onClick={onAction}
          aria-label={actionLabel}
          className="btn-primary-console h-12 text-[10px] uppercase font-bold tracking-widest px-6"
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}
