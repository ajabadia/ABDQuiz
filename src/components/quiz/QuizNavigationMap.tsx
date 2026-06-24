'use client';

/**
 * @purpose Renderiza una mapa de navegación para preguntas de quiz, permitiendo a los usuarios saltar entre ellas y indicando el estado actual de la pregunta y respuesta.
 * @purpose_en Renders a navigation map for quiz questions, allowing users to jump between them and indicating the current question and answer status.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:1,sig:w7pqsy
 * @lastUpdated 2026-06-23T19:49:51.161Z
 */

import { cn } from '@/lib/utils';

interface QuestionItem {
  questionId: string;
}

interface QuizNavigationMapProps {
  questions: QuestionItem[];
  currentIndex: number;
  answers: (number | null)[];
  isSubmitting: boolean;
  onJump: (idx: number) => void;
}

export function QuizNavigationMap({
  questions,
  currentIndex,
  answers,
  isSubmitting,
  onJump,
}: QuizNavigationMapProps) {
  return (
    <nav
      className="flex flex-wrap gap-2 justify-center border-b border-border pb-4 font-mono select-none"
      aria-label="Navegación de Preguntas"
    >
      {questions.map((q, idx) => {
        const isCurrent = idx === currentIndex;
        const isAnswered = answers[idx] !== null;
        return (
          <button
            aria-label={`Pregunta ${idx + 1}`}
            key={q.questionId}
            type="button"
            onClick={() => onJump(idx)}
            disabled={isSubmitting}
            className={cn(
              "w-8 h-8 flex items-center justify-center text-[10px] border transition-all cursor-pointer rounded-none font-bold",
              isCurrent
                ? "bg-primary border-primary text-black font-black animate-pulse"
                : isAnswered
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-white/[0.02] border-border text-muted-foreground hover:bg-white/5 hover:text-foreground"
            )}
          >
            {idx + 1}
          </button>
        );
      })}
    </nav>
  );
}
