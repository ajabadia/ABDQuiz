'use client';

/**
 * @purpose Renderiza una interfaz de usuario para resolver conflictos en preguntas de quiz, permitiendo a los usuarios seleccionar acciones y avanzar por el proceso de resolución de conflictos.
 * @purpose_en Renders a user interface for resolving conflicts in quiz questions, allowing users to select actions and progress through the conflict resolution process.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:10,sig:14427q0
 * @lastUpdated 2026-06-23T17:42:38.081Z
 */

import { useState } from 'react';
import { GitBranch, ArrowRight, Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { QuestionCard } from './QuestionComparison';
import { ConflictResolutionRadios } from './ConflictResolutionRadios';
import { ConflictLevelBadge } from './ConflictLevelBadge';
import { ConflictEmptyState } from './ConflictEmptyState';
import { RemediationComplete } from './RemediationComplete';
import { ProgressBar } from './ProgressBar';
import type { ConflictPair, RawQuestion } from './types';

interface RemediationConflictsStateProps {
  totalConflicts: number;
  currentConflict: ConflictPair | null;
  questionA: RawQuestion | null;
  questionB: RawQuestion | null;
  onApply: (resolution: { pairIndex: number; action: 'keep_both' | 'skip_second' }) => void;
  onResolveAll: () => void;
  resolvedSoFar: number;
  onBack: () => void;
}

export function RemediationConflictsState({
  totalConflicts, currentConflict, questionA, questionB,
  onApply, onResolveAll, resolvedSoFar, onBack,
}: RemediationConflictsStateProps) {
  const ap = useTranslations('adminPortal');
  const [selectedAction, setSelectedAction] = useState<'keep_both' | 'skip_second' | null>(null);
  const [initialTotal] = useState(totalConflicts);

  const allResolved = totalConflicts === 0;
  const conflictNumber = resolvedSoFar + 1;

  const handleApply = () => {
    if (!selectedAction || !currentConflict) return;
    onApply({ pairIndex: conflictNumber - 1, action: selectedAction });
    setSelectedAction(null);
  };

  if (allResolved) {
    return (
      <RemediationComplete
        title={ap('remediationConflictsAllResolved')}
        description={ap('remediationConflictsResolvedCount', { count: initialTotal })}
        actionLabel={ap('remediationConflictsContinue')}
        onAction={onResolveAll}
        onBack={onBack}
        backLabel={ap('btnBack')}
      />
    );
  }

  if (!currentConflict || !questionA || !questionB) {
    return <ConflictEmptyState onBack={onBack} />;
  }

  return (
    <div className="flex flex-col gap-5 animate-in fade-in">
      <div className="space-y-2">
        <div className="flex items-center gap-3 text-warning">
          <GitBranch className="w-6 h-6 animate-pulse" />
          <h2 className="text-lg font-black uppercase tracking-tight italic">
            {ap('remediationConflictsTitle')}
          </h2>
        </div>
        <p className="text-xs text-muted-foreground uppercase leading-relaxed font-mono">
          {ap('remediationConflictsSubtitle', { count: totalConflicts })}
        </p>
      </div>

      <div className="h-[1px] bg-border w-full" />

      <div className="flex items-center gap-3">
        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
          {ap('remediationConflictsProgress', { current: conflictNumber, total: totalConflicts })}
        </span>
        <ProgressBar current={conflictNumber} total={totalConflicts} className="flex-1 h-1.5 bg-muted" />
      </div>

      <ConflictLevelBadge conflict={currentConflict} />

      <div className="flex flex-col sm:flex-row gap-3">
        <QuestionCard question={questionA} side="A" />
        <div className="hidden sm:flex items-center justify-center shrink-0">
          <ArrowRight className="w-5 h-5 text-muted-foreground/50" />
        </div>
        <QuestionCard question={questionB} side="B" />
      </div>

      <ConflictResolutionRadios
        selectedAction={selectedAction}
        onSelectAction={setSelectedAction}
        questionBPregunta={questionB.pregunta}
      />

      <div className="flex gap-4 mt-2 border-t border-border pt-4">
        <button
          type="button"
          onClick={onBack}
          aria-label={ap('btnBack')}
          className="w-1/4 border border-border hover:bg-muted text-[10px] uppercase font-bold tracking-widest font-mono h-12"
        >
          {ap('btnBack')}
        </button>
        <button
          type="button"
          onClick={handleApply}
          disabled={!selectedAction}
          aria-label={ap('remediationConflictsApply')}
          className="btn-primary-console flex-1 h-12 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Check className="w-4 h-4" />
          {ap('remediationConflictsApply')}
        </button>
      </div>
    </div>
  );
}
