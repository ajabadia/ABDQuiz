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
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

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

      setAnswers(prev => {
        const updated = [...prev];
        updated[currentIndex] = selectedOption;
        return updated;
      });

      if (currentIndex < initialAttempt.questions.length - 1) {
        const nextIdx = currentIndex + 1;
        setCurrentIndex(nextIdx);
        setSelectedOption(answers[nextIdx]);
        setShowFeedback(false);
        resetTimerRef.current();
      } else {
        // Mostrar confirmación antes de finalizar
        setShowFinishConfirm(true);
      }
    } catch {
      toast.error(t('errorProcess'));
    } finally {
      setIsSubmitting(false);
    }
  }, [currentIndex, selectedOption, initialAttempt, currentQuestion, answers, t]);

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
        <nav className="flex flex-wrap gap-2 justify-center border-b border-white/5 pb-4 font-mono select-none" aria-label="Navegación de Preguntas">
          {initialAttempt.questions.map((q, idx) => {
            const isCurrent = idx === currentIndex;
            const isAnswered = answers[idx] !== null;
            return (
              <button aria-label={`Pregunta ${idx + 1}`}
                key={q.questionId}
                type="button"
                onClick={() => jumpToQuestion(idx)}
                disabled={isSubmitting}
                className={cn(
                  "w-8 h-8 flex items-center justify-center text-[10px] border transition-all cursor-pointer rounded-none font-bold",
                  isCurrent 
                    ? "bg-primary border-primary text-black font-black animate-pulse" 
                    : isAnswered 
                      ? "bg-primary/10 border-primary/30 text-primary" 
                      : "bg-white/[0.02] border-white/10 text-muted-foreground hover:bg-white/5 hover:text-foreground"
                )}
              >
                {idx + 1}
              </button>
            );
          })}
        </nav>
      )}

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

      <Dialog open={showFinishConfirm} onOpenChange={setShowFinishConfirm}>
        <DialogContent className="bg-card/95 backdrop-blur-2xl border-white/10 rounded-none shadow-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight uppercase italic text-foreground">
              {t('finishTitle')}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground mt-4 leading-relaxed antialiased">
              {t('finishDescription')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-4 mt-8">
            <Button variant="outline" className="rounded-none font-mono text-[10px] tracking-widest uppercase flex-1 h-12" onClick={() => setShowFinishConfirm(false)}>
              {t('cancelAction')}
            </Button>
            <Button className="rounded-none font-mono text-[10px] tracking-widest uppercase flex-1 h-12 bg-primary hover:bg-primary/90" onClick={confirmFinish}>
              {t('confirmFinish')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
