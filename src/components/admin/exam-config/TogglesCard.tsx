'use client';

import { Card } from '@/components/ui/card';
import { CheckCircle2, ArrowRight, AlertCircle, BarChart3 } from 'lucide-react';

interface TogglesCardProps {
  showFeedbackDuringExam: boolean;
  allowSkip: boolean;
  allowReviewPrevious: boolean;
  autoAdvanceOnSelect: boolean;
  reviewOmittedQuestions: boolean;
  excludePreviouslyCorrect: boolean;
  adaptiveQuestionSelection: boolean;
  onChange: (fields: {
    showFeedbackDuringExam?: boolean;
    allowSkip?: boolean;
    allowReviewPrevious?: boolean;
    autoAdvanceOnSelect?: boolean;
    reviewOmittedQuestions?: boolean;
    excludePreviouslyCorrect?: boolean;
    adaptiveQuestionSelection?: boolean;
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
    </Card>
  );
}
