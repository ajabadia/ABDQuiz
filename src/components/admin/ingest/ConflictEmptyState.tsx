'use client';

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
