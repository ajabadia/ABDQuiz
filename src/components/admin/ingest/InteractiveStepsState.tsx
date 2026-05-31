'use client';

import { LabeledField } from '@ajabadia/styles';
import { ChevronRight, Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { InteractiveQuestionCard } from './InteractiveQuestionCard';
import type { RawQuestion } from './types';

interface InteractiveStepsStateProps {
  currentIncompleteIndex: number;
  totalIncomplete: number;
  question: RawQuestion;
  remediationData: Partial<RawQuestion>;
  onDataChange: (data: Partial<RawQuestion>) => void;
  onBack: () => void;
  onNext: () => void;
  isUploading: boolean;
}

function ProgressWidth({ index, total }: { index: number; total: number }) {
  const pct = total <= 0 ? 0 : (index + 1) / total;
  const cls = pct >= 0.95 ? 'w-full' : pct >= 0.8 ? 'w-10/12' : pct >= 0.66 ? 'w-8/12' :
    pct >= 0.5 ? 'w-6/12' : pct >= 0.33 ? 'w-4/12' : pct >= 0.16 ? 'w-2/12' : 'w-1/12';
  return <div className={`h-full bg-primary transition-all duration-300 ${cls}`} />;
}

export function InteractiveStepsState({
  currentIncompleteIndex,
  totalIncomplete,
  question,
  remediationData,
  onDataChange,
  onBack,
  onNext,
  isUploading,
}: InteractiveStepsStateProps) {
  const ap = useTranslations('adminPortal');

  return (
    <div className="flex flex-col gap-6 animate-in fade-in">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="space-y-1">
          <h3 className="text-sm font-mono font-bold text-primary uppercase tracking-widest">
            {ap('manualRemedTitle')}
          </h3>
          <span className="text-[10px] text-muted-foreground uppercase font-mono">
            {ap('manualRemedSubtitle', { index: currentIncompleteIndex + 1, total: totalIncomplete })}
          </span>
        </div>
        <div className="h-2 w-28 bg-muted relative">
          <ProgressWidth index={currentIncompleteIndex} total={totalIncomplete} />
        </div>
      </div>

      <InteractiveQuestionCard question={question} />

      <div className="space-y-4">
        <span className="text-[10px] font-mono text-primary uppercase tracking-widest font-bold">
          {ap('informMissing')}
        </span>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <LabeledField id="interactive-module" label={ap('labelModule')} labelClassName="text-[9px] uppercase text-muted-foreground font-mono">
            <input
              type="text"
              value={remediationData.modulo || ''}
              onChange={(e) => onDataChange({ ...remediationData, modulo: e.target.value })}
              placeholder="Ej: Seguridad"
              className="input-console h-10"
            />
          </LabeledField>

          <LabeledField id="interactive-source" label={ap('labelSource')} labelClassName="text-[9px] uppercase text-muted-foreground font-mono">
            <input
              type="text"
              value={remediationData.fuente || ''}
              onChange={(e) => onDataChange({ ...remediationData, fuente: e.target.value })}
              placeholder="Ej: Examen Oficial"
              className="input-console h-10"
            />
          </LabeledField>

          <LabeledField id="interactive-difficulty" label={ap('labelDifficulty')} labelClassName="text-[9px] uppercase text-muted-foreground font-mono" className="md:col-span-2">
            <select
              value={remediationData.difficulty || 'medium'}
              onChange={(e) => onDataChange({ ...remediationData, difficulty: e.target.value as 'easy' | 'medium' | 'hard' })}
              className="input-console h-10 uppercase"
            >
              <option value="easy">{ap('diffEasy')}</option>
              <option value="medium">{ap('diffMedium')}</option>
              <option value="hard">{ap('diffHard')}</option>
            </select>
          </LabeledField>
        </div>
      </div>

      <div className="flex gap-4 mt-4 border-t border-border pt-4">
        <button
          type="button"
          onClick={onBack}
          aria-label={ap('btnBack')}
          className="w-1/3 border border-border hover:bg-muted text-[10px] uppercase font-bold tracking-widest font-mono h-12"
        >
          {ap('btnBack')}
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={isUploading}
          aria-label={currentIncompleteIndex === totalIncomplete - 1 ? ap('btnApplyBank') : ap('btnNextQuestion')}
          className="btn-primary-console flex-1 h-12 flex items-center justify-center gap-2 cursor-pointer"
        >
          {isUploading ? ap('btnSaving')
            : currentIncompleteIndex === totalIncomplete - 1 ? (
              <><Check className="w-4 h-4" />{ap('btnApplyBank')}</>
            ) : (
              <>{ap('btnNextQuestion')}<ChevronRight className="w-4 h-4" /></>
            )}
        </button>
      </div>
    </div>
  );
}
