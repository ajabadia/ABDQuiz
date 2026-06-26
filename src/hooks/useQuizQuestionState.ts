'use client';

/**
 * @purpose Gestiona el estado interativo del pregunta actual de quiz, incluyendo opciones seleccionadas y respuestas de texto.
 * @purpose_en Manages the interactive state of the current quiz question, including selected options and text answers.
 * @refactorable false
 * @classification Custom Hook
 * @complexity Medium
 * @fingerprint exports:1,imports:2,sig:1yb7jaq
 * @lastUpdated 2026-06-26T10:02:53.284Z
 */

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

  const [attachmentUrls, setAttachmentUrls] = useState<Record<number, string>>({});

  const [selectedOption, setSelectedOption] = useState<number | null>(() =>
    initialAttempt.questions[0]?.selectedOptionIndex !== undefined
      ? initialAttempt.questions[0].selectedOptionIndex
      : null,
  );

  const [showFeedback, setShowFeedback] = useState(false);

  const handleTextChange = useCallback((text: string) => {
    setTextAnswers(prev => ({ ...prev, [currentIndex]: text }));
  }, [currentIndex]);

  const handleAttachmentUpload = useCallback((url: string) => {
    setAttachmentUrls(prev => ({ ...prev, [currentIndex]: url }));
  }, [currentIndex]);

  return {
    answers,
    setAnswers,
    textAnswers,
    setTextAnswers,
    attachmentUrls,
    setAttachmentUrls,
    selectedOption,
    setSelectedOption,
    showFeedback,
    setShowFeedback,
    handleTextChange,
    handleAttachmentUpload,
  };
}
