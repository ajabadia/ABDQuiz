'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuizTimer } from '@/hooks/useQuizTimer';
import { submitAnswerAction, finishQuizAction } from '@/actions/quiz';
import { toast } from 'sonner';
import { QuizHeader } from './QuizHeader';
import QuizQuestion from './QuizQuestion';
import QuizFooter from './QuizFooter';
import { type SerializedExamAttempt } from '@/types/quiz';

interface QuizInterfaceProps {
  initialAttempt: SerializedExamAttempt;
}

export default function QuizInterface({ initialAttempt }: QuizInterfaceProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  const currentQuestion = initialAttempt.questions[currentIndex];

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
        timeSpent: initialAttempt.questionTimeLimitSeconds,
        status
      });

      if (currentIndex < initialAttempt.questions.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setSelectedOption(null);
        setShowFeedback(false);
      } else {
        // Finalizar y redirigir
        const result = await finishQuizAction(initialAttempt._id);
        if (result.success) {
          router.push(`/quiz/${initialAttempt._id}/results`);
        }
      }
    } catch {
      toast.error('Error en el proceso del examen');
    } finally {
      setIsSubmitting(false);
    }
  }, [currentIndex, selectedOption, initialAttempt, currentQuestion, router]);

  const handleGlobalTimeout = useCallback(() => {
    toast.error('Tiempo global agotado. Finalizando examen...');
    finishQuizAction(initialAttempt._id).then(() => {
      router.push(`/quiz/${initialAttempt._id}/results`);
    });
  }, [initialAttempt._id, router]);

  const handleQuestionTimeout = useCallback(() => {
    if (!showFeedback) {
      toast.warning('Tiempo de pregunta agotado. Saltando...');
      handleNext(true).catch(() => {});
    }
  }, [showFeedback, handleNext]);

  const { globalTime, questionTime, isGlobalLow, isQuestionLow } = useQuizTimer({
    totalSeconds: initialAttempt.timeLimitSeconds,
    questionSeconds: initialAttempt.questionTimeLimitSeconds,
    onGlobalTimeout: handleGlobalTimeout,
    onQuestionTimeout: handleQuestionTimeout,
  });

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

      <main className="flex-1 overflow-y-auto">
        <QuizQuestion 
          qs={currentQuestion.questionSnapshot}
          selectedOption={selectedOption}
          showFeedback={showFeedback}
          isSubmitting={isSubmitting}
          onSelect={setSelectedOption}
        />
      </main>

      <QuizFooter 
        onNext={() => handleNext(false)}
        onSkip={() => handleNext(true)}
        onShowFeedback={() => setShowFeedback(true)}
        isSubmitting={isSubmitting}
        showFeedback={showFeedback}
        selectedOption={selectedOption}
        mode={initialAttempt.mode === 'mock' ? 'exam' : 'training'}
        isLast={currentIndex === initialAttempt.questions.length - 1}
      />
    </div>
  );
}
