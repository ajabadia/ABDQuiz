'use client';

import { Card } from '@/components/ui/card';
import { CheckCircle2, ArrowRight, AlertCircle, BarChart3, Sliders } from 'lucide-react';

interface TogglesCardProps {
  showFeedbackDuringExam: boolean;
  allowSkip: boolean;
  allowReviewPrevious: boolean;
  autoAdvanceOnSelect: boolean;
  reviewOmittedQuestions: boolean;
  excludePreviouslyCorrect: boolean;
  adaptiveQuestionSelection: boolean;
  sliceOptionsCount: number | null;
  onChange: (fields: {
    showFeedbackDuringExam?: boolean;
    allowSkip?: boolean;
    allowReviewPrevious?: boolean;
    autoAdvanceOnSelect?: boolean;
    reviewOmittedQuestions?: boolean;
    excludePreviouslyCorrect?: boolean;
    adaptiveQuestionSelection?: boolean;
    sliceOptionsCount?: number | null;
  }) => void;
  translations: {
    feedbackLabel: string;
    feedbackDesc: string;
    skipLabel: string;
    skipDesc: string;
    reviewLabel: string;
    reviewDesc: string;
    autoAdvanceLabel: string;
    autoAdvanceDesc: string;
    reviewOmittedLabel: string;
    reviewOmittedDesc: string;
    excludeCorrectLabel: string;
    excludeCorrectDesc: string;
    adaptiveLabel: string;
    adaptiveDesc: string;
    sliceOptionsLabel?: string;
    sliceOptionsDesc?: string;
  };
}

export function TogglesCard({
  showFeedbackDuringExam,
  allowSkip,
  allowReviewPrevious,
  autoAdvanceOnSelect,
  reviewOmittedQuestions,
  excludePreviouslyCorrect,
  adaptiveQuestionSelection,
  sliceOptionsCount,
  onChange,
  translations,
}: TogglesCardProps) {
  return (
    <Card className="p-8 bg-card/20 border-border rounded-none grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      <div
        className={`p-4 border border-border cursor-pointer transition-colors ${
          showFeedbackDuringExam ? 'bg-primary/5 border-primary/20' : 'hover:bg-white/5'
        }`}
        onClick={() => onChange({ showFeedbackDuringExam: !showFeedbackDuringExam })}
      >
        <div className="flex items-center gap-3 mb-2">
          <CheckCircle2 className={`w-4 h-4 ${showFeedbackDuringExam ? 'text-primary' : 'text-muted-foreground'}`} />
          <span className="text-[10px] uppercase font-bold tracking-widest">{translations.feedbackLabel}</span>
        </div>
        <p className="text-[9px] text-muted-foreground leading-relaxed uppercase">{translations.feedbackDesc}</p>
      </div>

      <div
        className={`p-4 border border-border cursor-pointer transition-colors ${
          allowSkip ? 'bg-primary/5 border-primary/20' : 'hover:bg-white/5'
        }`}
        onClick={() => onChange({ allowSkip: !allowSkip })}
      >
        <div className="flex items-center gap-3 mb-2">
          <ArrowRight className={`w-4 h-4 ${allowSkip ? 'text-primary' : 'text-muted-foreground'}`} />
          <span className="text-[10px] uppercase font-bold tracking-widest">{translations.skipLabel}</span>
        </div>
        <p className="text-[9px] text-muted-foreground leading-relaxed uppercase">{translations.skipDesc}</p>
      </div>

      <div
        className={`p-4 border border-border cursor-pointer transition-colors ${
          allowReviewPrevious ? 'bg-primary/5 border-primary/20' : 'hover:bg-white/5'
        }`}
        onClick={() => onChange({ allowReviewPrevious: !allowReviewPrevious })}
      >
        <div className="flex items-center gap-3 mb-2">
          <AlertCircle className={`w-4 h-4 ${allowReviewPrevious ? 'text-primary' : 'text-muted-foreground'}`} />
          <span className="text-[10px] uppercase font-bold tracking-widest">{translations.reviewLabel}</span>
        </div>
        <p className="text-[9px] text-muted-foreground leading-relaxed uppercase">{translations.reviewDesc}</p>
      </div>

      <div
        className={`p-4 border border-border cursor-pointer transition-colors ${
          autoAdvanceOnSelect ? 'bg-primary/5 border-primary/20' : 'hover:bg-white/5'
        }`}
        onClick={() => onChange({ autoAdvanceOnSelect: !autoAdvanceOnSelect })}
      >
        <div className="flex items-center gap-3 mb-2">
          <CheckCircle2 className={`w-4 h-4 ${autoAdvanceOnSelect ? 'text-primary' : 'text-muted-foreground'}`} />
          <span className="text-[10px] uppercase font-bold tracking-widest">{translations.autoAdvanceLabel}</span>
        </div>
        <p className="text-[9px] text-muted-foreground leading-relaxed uppercase font-mono">
          {translations.autoAdvanceDesc}
        </p>
      </div>

      <div
        className={`p-4 border border-border cursor-pointer transition-colors ${
          reviewOmittedQuestions ? 'bg-primary/5 border-primary/20' : 'hover:bg-white/5'
        }`}
        onClick={() => onChange({ reviewOmittedQuestions: !reviewOmittedQuestions })}
      >
        <div className="flex items-center gap-3 mb-2">
          <AlertCircle className={`w-4 h-4 ${reviewOmittedQuestions ? 'text-primary' : 'text-muted-foreground'}`} />
          <span className="text-[10px] uppercase font-bold tracking-widest">{translations.reviewOmittedLabel}</span>
        </div>
        <p className="text-[9px] text-muted-foreground leading-relaxed uppercase font-mono">
          {translations.reviewOmittedDesc}
        </p>
      </div>

      <div
        className={`p-4 border border-border cursor-pointer transition-colors ${
          excludePreviouslyCorrect ? 'bg-primary/5 border-primary/20' : 'hover:bg-white/5'
        }`}
        onClick={() => onChange({ excludePreviouslyCorrect: !excludePreviouslyCorrect })}
      >
        <div className="flex items-center gap-3 mb-2">
          <CheckCircle2 className={`w-4 h-4 ${excludePreviouslyCorrect ? 'text-primary' : 'text-muted-foreground'}`} />
          <span className="text-[10px] uppercase font-bold tracking-widest">{translations.excludeCorrectLabel}</span>
        </div>
        <p className="text-[9px] text-muted-foreground leading-relaxed uppercase font-mono">
          {translations.excludeCorrectDesc}
        </p>
      </div>

      <div
        className={`p-4 border border-border cursor-pointer transition-colors ${
          adaptiveQuestionSelection ? 'bg-primary/5 border-primary/20' : 'hover:bg-white/5'
        }`}
        onClick={() => onChange({ adaptiveQuestionSelection: !adaptiveQuestionSelection })}
      >
        <div className="flex items-center gap-3 mb-2">
          <BarChart3 className={`w-4 h-4 ${adaptiveQuestionSelection ? 'text-primary' : 'text-muted-foreground'}`} />
          <span className="text-[10px] uppercase font-bold tracking-widest">{translations.adaptiveLabel}</span>
        </div>
        <p className="text-[9px] text-muted-foreground leading-relaxed uppercase font-mono">
          {translations.adaptiveDesc}
        </p>
      </div>

      {/* Dynamic Slicing Control */}
      <div className="md:col-span-2 lg:col-span-1 p-4 border border-border bg-card/10">
        <div className="flex items-center gap-3 mb-3">
          <Sliders className="w-4 h-4 text-muted-foreground" />
          <span className="text-[10px] uppercase font-bold tracking-widest">{translations.sliceOptionsLabel || 'Respuestas Visibles'}</span>
        </div>
        <p className="text-[9px] text-muted-foreground leading-relaxed uppercase font-mono mb-3">
          {translations.sliceOptionsDesc || 'Reduce las opciones mostradas por pregunta. 0 = todas.'}
        </p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={10}
            value={sliceOptionsCount ?? 0}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              onChange({ sliceOptionsCount: val >= 2 ? val : null });
            }}
            className="w-16 h-8 bg-black/20 border border-border text-center font-mono text-[11px] text-foreground focus:outline-none focus:border-primary/50"
            placeholder="0"
          />
          <span className="text-[8px] uppercase font-mono text-muted-foreground tracking-wider">
            opciones
          </span>
        </div>
      </div>
    </Card>
  );
}
