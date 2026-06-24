'use client';

/**
 * @purpose Renderiza un componente UI para mostrar una notificacion emergente y un boton cuando no hay conflictos de remediacion.
 * @purpose_en Renders a UI component to display a message and a button when there are no remediation conflicts.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:2,sig:1pihuc0
 * @lastUpdated 2026-06-23T17:41:06.192Z
 */

import { ShieldAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function ConflictEmptyState({ onBack }: { onBack: () => void }) {
  const ap = useTranslations('adminPortal');
  return (
    <div className="flex flex-col gap-6 animate-in fade-in items-center justify-center py-12">
      <ShieldAlert className="w-10 h-10 text-warning" />
      <p className="text-xs text-muted-foreground font-mono uppercase">
        {ap('remediationConflictsNoConflicts')}
      </p>
      <button
        type="button"
        onClick={onBack}
        aria-label={ap('btnBack')}
        className="border border-border hover:bg-muted text-[10px] uppercase font-bold tracking-widest font-mono h-12 px-6"
      >
        {ap('btnBack')}
      </button>
    </div>
  );
}
