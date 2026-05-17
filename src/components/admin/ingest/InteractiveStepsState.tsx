'use client';

import { ChevronRight, Check } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface RawQuestion {
  pregunta: string;
  opciones: string[];
  respuesta_correcta: number;
  explicacion?: string;
  modulo?: string;
  fuente?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  tags?: string[];
}

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

export function InteractiveStepsState({
  currentIncompleteIndex,
  totalIncomplete,
  question,
  remediationData,
  onDataChange,
  onBack,
  onNext,
  isUploading
}: InteractiveStepsStateProps) {
  const ap = useTranslations('adminPortal');

  // Calculates nearest Tailwind utility width class to bypass the inline style rules
  const getProgressWidthClass = (index: number, total: number): string => {
    if (total <= 0) return 'w-0';
    const ratio = (index + 1) / total;
    if (ratio >= 0.95) return 'w-full';
    if (ratio >= 0.9) return 'w-11/12';
    if (ratio >= 0.8) return 'w-10/12';
    if (ratio >= 0.75) return 'w-9/12';
    if (ratio >= 0.66) return 'w-8/12';
    if (ratio >= 0.58) return 'w-7/12';
    if (ratio >= 0.5) return 'w-6/12';
    if (ratio >= 0.4) return 'w-5/12';
    if (ratio >= 0.33) return 'w-4/12';
    if (ratio >= 0.25) return 'w-3/12';
    if (ratio >= 0.16) return 'w-2/12';
    if (ratio >= 0.08) return 'w-1/12';
    return 'w-1/12';
  };

  const widthClass = getProgressWidthClass(currentIncompleteIndex, totalIncomplete);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in">
      
      {/* Header Wizard progress */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="space-y-1">
          <h3 className="text-sm font-mono font-bold text-primary uppercase tracking-widest">
            {ap('manualRemedTitle')}
          </h3>
          <span className="text-[10px] text-muted-foreground uppercase font-mono">
            {ap('manualRemedSubtitle', { index: currentIncompleteIndex + 1, total: totalIncomplete })}
          </span>
        </div>
        <div className="h-2 w-28 bg-white/5 relative">
          <div className={`h-full bg-primary transition-all duration-300 ${widthClass}`} />
        </div>
      </div>

      {/* Incomplete Question Card Visualizer */}
      <div className="p-5 bg-white/5 border border-white/5 space-y-4">
        <span className="text-[8px] font-mono text-muted-foreground uppercase tracking-widest">
          {ap('analyzedPrompt')}
        </span>
        <p className="text-sm font-bold text-foreground leading-relaxed">
          {question.pregunta}
        </p>
        
        <div className="grid grid-cols-1 gap-2 mt-4">
          {question.opciones.map((opt, idx) => (
            <div key={idx} className="flex items-center gap-3 p-2.5 bg-background/50 border border-white/5 text-xs text-muted-foreground rounded-none">
              <span className="font-mono text-[9px] uppercase font-bold text-primary bg-primary/10 px-1.5 py-0.5">
                {String.fromCharCode(65 + idx)}
              </span>
              {opt}
            </div>
          ))}
        </div>
      </div>

      {/* Conditional Remediation inputs */}
      <div className="space-y-4">
        <span className="text-[10px] font-mono text-primary uppercase tracking-widest font-bold">
          {ap('informMissing')}
        </span>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Module Input */}
          <div className="space-y-2">
            <label htmlFor="interactive-module" className="text-[9px] uppercase text-muted-foreground font-mono">
              {ap('labelModule')}
            </label>
            <input 
              id="interactive-module"
              type="text" 
              value={remediationData.modulo || ''}
              onChange={(e) => onDataChange({ ...remediationData, modulo: e.target.value })}
              placeholder="Ej: Seguridad"
              className="w-full bg-background border border-white/10 h-10 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>

          {/* Source Input */}
          <div className="space-y-2">
            <label htmlFor="interactive-source" className="text-[9px] uppercase text-muted-foreground font-mono">
              {ap('labelSource')}
            </label>
            <input 
              id="interactive-source"
              type="text" 
              value={remediationData.fuente || ''}
              onChange={(e) => onDataChange({ ...remediationData, fuente: e.target.value })}
              placeholder="Ej: Examen Oficial"
              className="w-full bg-background border border-white/10 h-10 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>

          {/* Difficulty Dropdown */}
          <div className="space-y-2 md:col-span-2">
            <label htmlFor="interactive-difficulty" className="text-[9px] uppercase text-muted-foreground font-mono">
              {ap('labelDifficulty')}
            </label>
            <select 
              id="interactive-difficulty"
              value={remediationData.difficulty || 'medium'}
              onChange={(e) => onDataChange({ ...remediationData, difficulty: e.target.value as 'easy' | 'medium' | 'hard' })}
              className="w-full bg-background border border-white/10 h-10 px-3 text-xs font-mono uppercase focus:outline-none focus:ring-1 focus:ring-primary/50"
            >
              <option value="easy">{ap('diffEasy')}</option>
              <option value="medium">{ap('diffMedium')}</option>
              <option value="hard">{ap('diffHard')}</option>
            </select>
          </div>

        </div>
      </div>

      {/* Pagination controls */}
      <div className="flex gap-4 mt-4 border-t border-white/5 pt-4">
        <button 
          type="button"
          onClick={onBack}
          aria-label={ap('btnBack')}
          className="w-1/3 border border-white/10 hover:bg-white/5 text-[10px] uppercase font-bold tracking-widest font-mono h-12"
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
          {isUploading ? (
            ap('btnSaving')
          ) : currentIncompleteIndex === totalIncomplete - 1 ? (
            <>
              <Check className="w-4 h-4" />
              {ap('btnApplyBank')}
            </>
          ) : (
            <>
              {ap('btnNextQuestion')}
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

    </div>
  );
}
