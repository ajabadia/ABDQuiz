'use client';

import { useTranslations } from 'next-intl';
import type { RawQuestion } from './types';

interface InteractiveQuestionCardProps {
  question: RawQuestion;
}

export function InteractiveQuestionCard({ question }: InteractiveQuestionCardProps) {
  const ap = useTranslations('adminPortal');

  return (
    <div className="p-5 bg-muted border border-border space-y-4">
      <span className="text-[8px] font-mono text-muted-foreground uppercase tracking-widest">
        {ap('analyzedPrompt')}
      </span>
      <p className="text-sm font-bold text-foreground leading-relaxed">
        {question.pregunta}
      </p>

      <div className="grid grid-cols-1 gap-2 mt-4">
        {question.opciones.map((opt, idx) => (
          <div
            key={idx}
            className="flex items-center gap-3 p-2.5 bg-background/50 border border-border text-xs text-muted-foreground rounded-none"
          >
            <span className="font-mono text-[9px] uppercase font-bold text-primary bg-primary/10 px-1.5 py-0.5">
              {String.fromCharCode(65 + idx)}
            </span>
            {opt}
          </div>
        ))}
      </div>
    </div>
  );
}
