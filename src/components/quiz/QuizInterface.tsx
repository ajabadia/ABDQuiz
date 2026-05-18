'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQuizTimer } from '@/hooks/useQuizTimer';
import { submitAnswerAction, finishQuizAction } from '@/actions/quiz';
import { toast } from 'sonner';
import { QuizHeader } from './QuizHeader';
import QuizQuestion from './QuizQuestion';
import QuizFooter from './QuizFooter';
import { type SerializedExamAttempt } from '@/types/quiz';
import { useTranslations } from 'next-intl';

// Import modular subcomponents
import { QuizNavigationMap } from './QuizNavigationMap';
import { FinishConfirmDialog } from './FinishConfirmDialog';
import { OmittedDialog } from './OmittedDialog';

interface QuizInterfaceProps {
  initialAttempt: SerializedExamAttempt;
}

export default function QuizInterface({ initialAttempt }: QuizInterfaceProps) {
  const router = useRouter();
  const t = useTranslations('quiz');
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Guardamos las respuestas de forma reactiva local
  const [answers, setAnswers] = useState<(number | null)[]>(() =>
    initialAttempt.questions.map(q => q.selectedOptionIndex !== undefined ? q.selectedOptionIndex : null)
  );

  const [selectedOption, setSelectedOption] = useState<number | null>(() => 
    initialAttempt.questions[0]?.selectedOptionIndex !== undefined ? initialAttempt.questions[0].selectedOptionIndex : null
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [showOmittedConfirm, setShowOmittedConfirm] = useState(false);
  const [isReviewingOmitted, setIsReviewingOmitted] = useState(false);

  const currentQuestion = initialAttempt.questions[currentIndex];

  // Refs to avoid circular dependency hoisting issues
  const resetTimerRef = useRef<() => void>(() => {});
  const questionTimeRef = useRef<number>(0);

  const jumpToQuestion = useCallback(async (targetIndex: number) => {
    if (targetIndex === currentIndex || isSubmitting) return;
    
    setIsSubmitting(true);
    const status = selectedOption === null 
      ? 'no_respondida'
      : selectedOption === currentQuestion.questionSnapshot.correctOptionIndex
        ? 'correcta'
        : 'incorrecta';
        
    try {
      // Guardar respuesta actual
      await submitAnswerAction({
        attemptId: initialAttempt._id,
        questionIndex: currentIndex,
        selectedOptionIndex: selectedOption,
        timeSpent: initialAttempt.questionTimeLimitSeconds - questionTimeRef.current,
        status
      });

      setAnswers(prev => {
        const updated = [...prev];
        updated[currentIndex] = selectedOption;
        return updated;
      });

      // Saltar a la pregunta destino y cargar su respuesta guardada directamente
      setCurrentIndex(targetIndex);
      setSelectedOption(answers[targetIndex]);
      setShowFeedback(false);
      resetTimerRef.current();
    } catch {
      toast.error('Error al guardar la respuesta anterior');
    } finally {
      setIsSubmitting(false);
    }
  }, [currentIndex, selectedOption, initialAttempt, currentQuestion, answers, isSubmitting]);

  const handleNext = useCallback(async (isTimeout = false) => {
    setIsSubmitting(true);
    
    const status = isTimeout 
      ? 'no_respondida_por_tiempo' 
      : selectedOption === null 
        ? 'no_respondida'
        : selectedOption === currentQuestion.questionSnapshot.correctOptionIndex
          ? 'correcta'
          : 'incorrecta';

    try {
      await submitAnswerAction({
        attemptId: initialAttempt._id,
        questionIndex: currentIndex,
        selectedOptionIndex: selectedOption,
        timeSpent: initialAttempt.questionTimeLimitSeconds - questionTimeRef.current,
        status
      });

      const updatedAnswers = [...answers];
      updatedAnswers[currentIndex] = selectedOption;
      setAnswers(updatedAnswers);

      if (isReviewingOmitted) {
        const remainingOmitted = updatedAnswers
          .map((ans, idx) => ans === null ? idx : null)
          .filter((idx): idx is number => idx !== null);

        if (remainingOmitted.length > 0) {
          const nextOmitted = remainingOmitted.find(idx => idx > currentIndex) ?? remainingOmitted[0];
          setCurrentIndex(nextOmitted);
          setSelectedOption(updatedAnswers[nextOmitted]);
          setShowFeedback(false);
          resetTimerRef.current();
        } else {
          setIsReviewingOmitted(false);
          setShowFinishConfirm(true);
        }
      } else {
        if (currentIndex < initialAttempt.questions.length - 1) {
          const nextIdx = currentIndex + 1;
          setCurrentIndex(nextIdx);
          setSelectedOption(updatedAnswers[nextIdx]);
          setShowFeedback(false);
          resetTimerRef.current();
        } else {
          const hasOmitted = updatedAnswers.some(ans => ans === null);
          if (initialAttempt.examConfigId?.reviewOmittedQuestions && hasOmitted) {
            setShowOmittedConfirm(true);
          } else {
            setShowFinishConfirm(true);
          }
        }
      }
    } catch {
      toast.error(t('errorProcess'));
    } finally {
      setIsSubmitting(false);
    }
  }, [currentIndex, selectedOption, initialAttempt, currentQuestion, answers, isReviewingOmitted, t]);

  const handleOptionSelect = useCallback(async (optionIndex: number) => {
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
          timeSpent: initialAttempt.questionTimeLimitSeconds - questionTimeRef.current,
          status
        });

        const updatedAnswers = [...answers];
        updatedAnswers[currentIndex] = optionIndex;
        setAnswers(updatedAnswers);

        if (isReviewingOmitted) {
          const remainingOmitted = updatedAnswers
            .map((ans, idx) => ans === null ? idx : null)
            .filter((idx): idx is number => idx !== null);

          if (remainingOmitted.length > 0) {
            const nextOmitted = remainingOmitted.find(idx => idx > currentIndex) ?? remainingOmitted[0];
            setCurrentIndex(nextOmitted);
            setSelectedOption(updatedAnswers[nextOmitted]);
            setShowFeedback(false);
            resetTimerRef.current();
          } else {
            setIsReviewingOmitted(false);
            setShowFinishConfirm(true);
          }
        } else {
          if (currentIndex < initialAttempt.questions.length - 1) {
            const nextIdx = currentIndex + 1;
            setCurrentIndex(nextIdx);
            setSelectedOption(updatedAnswers[nextIdx]);
            setShowFeedback(false);
            resetTimerRef.current();
          } else {
            const hasOmitted = updatedAnswers.some(ans => ans === null);
            if (initialAttempt.examConfigId?.reviewOmittedQuestions && hasOmitted) {
              setShowOmittedConfirm(true);
            } else {
              setShowFinishConfirm(true);
            }
          }
        }
      } catch {
        toast.error(t('errorProcess'));
      } finally {
        setIsSubmitting(false);
      }
    }
  }, [currentIndex, initialAttempt, currentQuestion, answers, isReviewingOmitted, t]);

  const handlePrevious = useCallback(async () => {
    if (currentIndex > 0) {
      await jumpToQuestion(currentIndex - 1);
    }
  }, [currentIndex, jumpToQuestion]);

  const startOmittedReview = () => {
    setShowOmittedConfirm(false);
    setIsReviewingOmitted(true);
    
    const firstOmittedIdx = answers.findIndex(ans => ans === null);
    if (firstOmittedIdx !== -1) {
      setCurrentIndex(firstOmittedIdx);
      setSelectedOption(null);
      setShowFeedback(false);
      resetTimerRef.current();
    }
  };

  const handleGlobalTimeout = useCallback(() => {
    toast.error(t('globalTimeout'));
    finishQuizAction(initialAttempt._id).then(() => {
      router.push(`/quiz/${initialAttempt._id}/results`);
    });
  }, [initialAttempt._id, router, t]);

  const handleQuestionTimeout = useCallback(() => {
    if (!showFeedback) {
      toast.warning(t('questionTimeout'));
      handleNext(true).catch(() => {});
    }
  }, [showFeedback, handleNext, t]);

  const { globalTime, questionTime, isGlobalLow, isQuestionLow, resetQuestionTimer } = useQuizTimer({
    totalSeconds: initialAttempt.timeLimitSeconds,
    questionSeconds: initialAttempt.questionTimeLimitSeconds,
    onGlobalTimeout: handleGlobalTimeout,
    onQuestionTimeout: handleQuestionTimeout,
    isPaused: showFinishConfirm || isSubmitting
  });

  // Sync refs with hook values on each render
  useEffect(() => {
    resetTimerRef.current = resetQuestionTimer;
    questionTimeRef.current = questionTime;
  }, [resetQuestionTimer, questionTime]);

  const confirmFinish = async () => {
    setIsSubmitting(true);
    setShowFinishConfirm(false);
    try {
      const result = await finishQuizAction(initialAttempt._id);
      if (result.success) {
        router.push(`/quiz/${initialAttempt._id}/results`);
      }
    } catch {
      toast.error('Fallo al finalizar el examen');
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-screen max-w-5xl mx-auto w-full px-6 py-4 gap-8">
      <QuizHeader 
        currentIndex={currentIndex}
        totalQuestions={initialAttempt.questions.length}
        globalTime={globalTime}
        questionTime={questionTime}
        isGlobalLow={isGlobalLow}
        isQuestionLow={isQuestionLow}
        formatTime={formatTime}
      />

      {/* 🧭 Non-linear Navigation Map */}
      {initialAttempt.examConfigId?.allowReviewPrevious && (
        <QuizNavigationMap
          questions={initialAttempt.questions}
          currentIndex={currentIndex}
          answers={answers}
          isSubmitting={isSubmitting}
          onJump={jumpToQuestion}
        />
      )}

      <main className="flex-1 overflow-y-auto">
        <QuizQuestion 
          qs={currentQuestion.questionSnapshot}
          selectedOption={selectedOption}
          showFeedback={showFeedback}
          isSubmitting={isSubmitting}
          onSelect={handleOptionSelect}
        />
      </main>

      <QuizFooter 
        onNext={() => handleNext(false)}
        onSkip={() => handleNext(true)}
        onShowFeedback={() => setShowFeedback(true)}
        onPrevious={handlePrevious}
        isSubmitting={isSubmitting}
        showFeedback={showFeedback}
        selectedOption={selectedOption}
        mode={initialAttempt.mode === 'mock' ? 'exam' : 'training'}
        isLast={currentIndex === initialAttempt.questions.length - 1}
        allowReviewPrevious={initialAttempt.examConfigId?.allowReviewPrevious}
        hasPrevious={currentIndex > 0}
      />

      <FinishConfirmDialog
        open={showFinishConfirm}
        onOpenChange={setShowFinishConfirm}
        onConfirm={confirmFinish}
        translations={{
          finishTitle: t('finishTitle'),
          finishDescription: t('finishDescription'),
          cancelAction: t('cancelAction'),
          confirmFinish: t('confirmFinish'),
        }}
      />

      <OmittedDialog
        open={showOmittedConfirm}
        onOpenChange={setShowOmittedConfirm}
        onFinalize={() => { setShowOmittedConfirm(false); setShowFinishConfirm(true); }}
        onReview={startOmittedReview}
      />
    </div>
  );
}
