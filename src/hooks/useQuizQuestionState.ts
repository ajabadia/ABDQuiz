'use client';

import { useState, useCallback } from 'react';
import { type SerializedExamAttempt } from '@/types/quiz';

/**
 * Gestiona el estado interactivo de la pregunta actual:
 * respuestas guardadas (MC y texto), opción seleccionada, feedback visible.
 */
export function useQuizQuestionState(
  initialAttempt: SerializedExamAttempt,
  currentIndex: number,
) {
  const [answers, setAnswers] = useState<(number | null)[]>(() =>
    initialAttempt.questions.map(q => q.selectedOptionIndex !== undefined ? q.selectedOptionIndex : null),
  );

  const [textAnswers, setTextAnswers] = useState<Record<number, string>>(() => {
    const initial: Record<number, string> = {};
    initialAttempt.questions.forEach((q, idx) => {
      if (q.manualTextAnswer) {
        initial[idx] = q.manualTextAnswer;
      }
    });
    return initial;
  });

  const [selectedOption, setSelectedOption] = useState<number | null>(() =>
    initialAttempt.questions[0]?.selectedOptionIndex !== undefined
      ? initialAttempt.questions[0].selectedOptionIndex
      : null,
  );

  const [showFeedback, setShowFeedback] = useState(false);

  const handleTextChange = useCallback((text: string) => {
    setTextAnswers(prev => ({ ...prev, [currentIndex]: text }));
  }, [currentIndex]);

  return {
    answers,
    setAnswers,
    textAnswers,
    setTextAnswers,
    selectedOption,
    setSelectedOption,
    showFeedback,
    setShowFeedback,
    handleTextChange,
  };
}
