'use client';

/**
 * @purpose Renderiza una tarjeta que muestra detalles de una pregunta para comparación, incluyendo opciones y metadatos.
 * @purpose_en Renders a card displaying details of a question for comparison, including options and metadata.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:2,sig:1rekyr0
 * @lastUpdated 2026-06-23T17:42:24.306Z
 */

import { useTranslations } from 'next-intl';
import type { RawQuestion, ConflictPair } from './types';

function OptionsList({
  options,
  correctIndex,
  label,
}: {
  options: string[];
  correctIndex: number;
  label: string;
}) {
  const ap = useTranslations('adminPortal');

  return (
    <div className="space-y-1.5">
      <span className="text-[8px] font-mono text-muted-foreground uppercase tracking-widest">
        {label}
      </span>
      <div className="space-y-1">
        {options.map((opt, idx) => {
          const isCorrect = idx === correctIndex;
          return (
            <div
              key={idx}
              className={`flex items-start gap-2 px-2.5 py-1.5 text-[11px] font-mono leading-relaxed border-l-2 ${
                isCorrect
                  ? 'border-emerald-500 bg-emerald-500/5 text-emerald-500'
                  : 'border-border text-muted-foreground'
              }`}
            >
              <span className="shrink-0 w-4 text-center font-bold">
                {String.fromCharCode(65 + idx)}
              </span>
              <span>{opt}</span>
              {isCorrect && (
                <span className="ml-auto shrink-0 text-[8px] uppercase tracking-widest text-emerald-500 font-bold">
                  {ap('remediationConflictsCorrectLabel')}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function QuestionCard({
  question,
  side,
}: {
  question: RawQuestion;
  side: 'A' | 'B';
}) {
  const ap = useTranslations('adminPortal');

  return (
    <div className="flex-1 min-w-0 space-y-3 p-4 bg-card/30 border border-border">
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <span className="text-[10px] font-bold font-mono uppercase tracking-widest text-primary">
          {side === 'A' ? '◀' : '▶'} [{side}]
        </span>
      </div>

      <div className="space-y-1">
        <span className="text-[8px] font-mono text-muted-foreground uppercase tracking-widest">
          {ap('remediationConflictsQuestionLabel')}
        </span>
        <p className="text-xs font-bold text-foreground leading-relaxed">
          {question.pregunta}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 text-[8px] font-mono uppercase tracking-wider">
        {question.modulo && (
          <span className="px-1.5 py-0.5 bg-muted border border-border text-muted-foreground">
            MOD {question.modulo}
          </span>
        )}
        {question.fuente && (
          <span className="px-1.5 py-0.5 bg-muted border border-border text-muted-foreground">
            SRC {question.fuente}
          </span>
        )}
        {question.difficulty && (
          <span className={`px-1.5 py-0.5 border ${
            question.difficulty === 'hard' ? 'border-destructive/30 text-destructive' :
            question.difficulty === 'easy' ? 'border-emerald-500/30 text-emerald-500' :
            'border-warning/30 text-warning'
          }`}>
            {question.difficulty.toUpperCase()}
          </span>
        )}
      </div>

      {question.opciones.length > 0 && (
        <OptionsList
          options={question.opciones}
          correctIndex={question.respuesta_correcta}
          label={ap('remediationConflictsOptionsLabel')}
        />
      )}
    </div>
  );
}
