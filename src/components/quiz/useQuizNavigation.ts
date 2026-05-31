'use client';

import { useState, useCallback, type RefObject } from 'react';
import { submitAnswerAction } from '@/actions/quiz';
import { toast } from 'sonner';
import { type SerializedExamAttempt } from '@/types/quiz';
import { useTranslations } from 'next-intl';

interface UseQuizNavigationParams {
  initialAttempt: SerializedExamAttempt;
  currentIndex: number;
  answers: (number | null)[];
  textAnswers: Record<number, string>;
  selectedOption: number | null;
  isSubmitting: boolean;
  // Setters
  setCurrentIndex: (idx: number) => void;
  setAnswers: (updater: (prev: (number | null)[]) => (number | null)[]) => void;
  setTextAnswers: (updater: (prev: Record<number, string>) => Record<number, string>) => void;
  setSelectedOption: (val: number | null) => void;
  setIsSubmitting: (val: boolean) => void;
  setShowFeedback: (val: boolean) => void;
  setShowFinishConfirm: (val: boolean) => void;
  setShowOmittedConfirm: (val: boolean) => void;
  // Ref to latest resetQuestionTimer (avoids stale closures)
  resetTimerRef: RefObject<() => void>;
}

export function useQuizNavigation({
  initialAttempt,
  currentIndex,
  answers,
  textAnswers,
  selectedOption,
  isSubmitting,
  setCurrentIndex,
  setAnswers,
  setTextAnswers,
  setSelectedOption,
  setIsSubmitting,
  setShowFeedback,
  setShowFinishConfirm,
  setShowOmittedConfirm,
  resetTimerRef,
}: UseQuizNavigationParams) {
  const t = useTranslations('quiz');
  const [isReviewingOmitted, setIsReviewingOmitted] = useState(false);

  const currentQuestion = initialAttempt.questions[currentIndex];
  const isOpenText = currentQuestion?.questionSnapshot.type === 'open_text';
  const textAnswer = textAnswers[currentIndex] ?? '';

  const getQuestionStatus = useCallback(
    (optionIdx: number | null, text: string, isTimeout: boolean): 'correcta' | 'incorrecta' | 'no_respondida' | 'no_respondida_por_tiempo' => {
      if (isTimeout) return 'no_respondida_por_tiempo';
      if (isOpenText) {
        return text.trim().length > 0 ? 'correcta' : 'no_respondida';
      }
      return optionIdx === null
        ? 'no_respondida'
        : optionIdx === currentQuestion.questionSnapshot.correctOptionIndex
          ? 'correcta'
          : 'incorrecta';
    },
    [isOpenText, currentQuestion],
  );

  const checkHasOmitted = useCallback(
    (ans: (number | null)[], txt: Record<number, string>) => {
      return ans.some((a, idx) => {
        const q = initialAttempt.questions[idx];
        if (q.questionSnapshot.type === 'open_text') {
          return (txt[idx] ?? '').trim().length === 0;
        }
        return a === null;
      });
    },
    [initialAttempt.questions],
  );

  const jumpToQuestion = useCallback(
    async (targetIndex: number) => {
      if (targetIndex === currentIndex || isSubmitting) return;

      setIsSubmitting(true);
      const status = getQuestionStatus(selectedOption, textAnswer, false);

      try {
        await submitAnswerAction({
          attemptId: initialAttempt._id,
          questionIndex: currentIndex,
          selectedOptionIndex: isOpenText ? null : selectedOption,
          timeSpent: initialAttempt.questionTimeLimitSeconds - 0,
          status,
          attemptToken: initialAttempt.attemptToken,
          textAnswer: isOpenText ? textAnswer : undefined,
        });

        setAnswers(prev => {
          const updated = [...prev];
          updated[currentIndex] = isOpenText ? null : selectedOption;
          return updated;
        });

        const targetQ = initialAttempt.questions[targetIndex];
        const targetIsOpenText = targetQ.questionSnapshot.type === 'open_text';
        setCurrentIndex(targetIndex);
        setSelectedOption(targetIsOpenText ? null : answers[targetIndex]);
        setShowFeedback(false);
        resetTimerRef.current?.();
      } catch {
        toast.error('Error al guardar la respuesta anterior');
      } finally {
        setIsSubmitting(false);
      }
    },
    [currentIndex, selectedOption, textAnswer, isOpenText, initialAttempt, answers, isSubmitting, getQuestionStatus, setAnswers, setCurrentIndex, setSelectedOption, setIsSubmitting, setShowFeedback, resetTimerRef],
  );

  const advanceToNext = useCallback(
    (updatedAnswers: (number | null)[], isTimeout: boolean) => {
      if (isReviewingOmitted) {
        const remainingOmitted = updatedAnswers
          .map((ans, idx) => {
            const q = initialAttempt.questions[idx];
            if (q.questionSnapshot.type === 'open_text') {
              return (textAnswers[idx] ?? '').trim().length === 0 ? idx : null;
            }
            return ans === null ? idx : null;
          })
          .filter((idx): idx is number => idx !== null);

        if (remainingOmitted.length > 0) {
          const nextOmitted = remainingOmitted.find(idx => idx > currentIndex) ?? remainingOmitted[0];
          const nextIsOpenText = initialAttempt.questions[nextOmitted].questionSnapshot.type === 'open_text';
          setCurrentIndex(nextOmitted);
          setSelectedOption(nextIsOpenText ? null : updatedAnswers[nextOmitted]);
          setShowFeedback(false);
          resetTimerRef.current?.();
        } else {
          setIsReviewingOmitted(false);
          setShowFinishConfirm(true);
        }
      } else {
        if (currentIndex < initialAttempt.questions.length - 1) {
          const nextIdx = currentIndex + 1;
          const nextIsOpenText = initialAttempt.questions[nextIdx].questionSnapshot.type === 'open_text';
          setCurrentIndex(nextIdx);
          setSelectedOption(nextIsOpenText ? null : updatedAnswers[nextIdx]);
          setShowFeedback(false);
          resetTimerRef.current?.();
        } else {
          const hasOmitted = checkHasOmitted(updatedAnswers, textAnswers);
          if (initialAttempt.examConfigId?.reviewOmittedQuestions && hasOmitted) {
            setShowOmittedConfirm(true);
          } else {
            setShowFinishConfirm(true);
          }
        }
      }
    },
    [isReviewingOmitted, currentIndex, initialAttempt, textAnswers, setCurrentIndex, setSelectedOption, setShowFeedback, resetTimerRef, setIsReviewingOmitted, setShowFinishConfirm, setShowOmittedConfirm, checkHasOmitted],
  );

  const handleNext = useCallback(
    async (isTimeout = false) => {
      setIsSubmitting(true);
      const status = getQuestionStatus(selectedOption, textAnswer, isTimeout);

      try {
        await submitAnswerAction({
          attemptId: initialAttempt._id,
          questionIndex: currentIndex,
          selectedOptionIndex: isOpenText ? null : selectedOption,
          timeSpent: initialAttempt.questionTimeLimitSeconds - 0,
          status,
          attemptToken: initialAttempt.attemptToken,
          textAnswer: isOpenText ? textAnswer : undefined,
        });

        setAnswers(prev => {
          const updated = [...prev];
          updated[currentIndex] = isOpenText ? null : selectedOption;
          advanceToNext(updated, isTimeout);
          return updated;
        });
      } catch {
        toast.error(t('errorProcess'));
      } finally {
        setIsSubmitting(false);
      }
    },
    [currentIndex, selectedOption, textAnswer, isOpenText, initialAttempt, getQuestionStatus, advanceToNext, setIsSubmitting, setAnswers, t],
  );

  const handlePrevious = useCallback(async () => {
    if (currentIndex > 0) {
      await jumpToQuestion(currentIndex - 1);
    }
  }, [currentIndex, jumpToQuestion]);

  const handleOptionSelect = useCallback(
    async (optionIndex: number) => {
      if (isOpenText) return;

      setSelectedOption(optionIndex);

      if (initialAttempt.examConfigId?.autoAdvanceOnSelect) {
        setIsSubmitting(true);
        const status = optionIndex === currentQuestion.questionSnapshot.correctOptionIndex
          ? 'correcta'
          : 'incorrecta';

        try {
          await submitAnswerAction({
            attemptId: initialAttempt._id,
            questionIndex: currentIndex,
            selectedOptionIndex: optionIndex,
            timeSpent: initialAttempt.questionTimeLimitSeconds - 0,
            status,
            attemptToken: initialAttempt.attemptToken,
          });

          setAnswers(prev => {
            const updated = [...prev];
            updated[currentIndex] = optionIndex;
            advanceToNext(updated, false);
            return updated;
          });
        } catch {
          toast.error(t('errorProcess'));
        } finally {
          setIsSubmitting(false);
        }
      }
    },
    [currentIndex, isOpenText, initialAttempt, currentQuestion, advanceToNext, setIsSubmitting, setSelectedOption, setAnswers, t],
  );

  const startOmittedReview = useCallback(() => {
    setShowOmittedConfirm(false);
    setIsReviewingOmitted(true);

    const firstOmittedIdx = answers.findIndex((ans, idx) => {
      const q = initialAttempt.questions[idx];
      if (q.questionSnapshot.type === 'open_text') {
        return (textAnswers[idx] ?? '').trim().length === 0;
      }
      return ans === null;
    });
    if (firstOmittedIdx !== -1) {
      setCurrentIndex(firstOmittedIdx);
      setSelectedOption(null);
      setShowFeedback(false);
      resetTimerRef.current?.();
    }
  }, [answers, initialAttempt.questions, textAnswers, setShowOmittedConfirm, setIsReviewingOmitted, setCurrentIndex, setSelectedOption, setShowFeedback, resetTimerRef]);

  return {
    getQuestionStatus,
    jumpToQuestion,
    handleNext,
    handlePrevious,
    handleOptionSelect,
    startOmittedReview,
    isOpenText,
    currentQuestion,
    textAnswer,
  };
}
