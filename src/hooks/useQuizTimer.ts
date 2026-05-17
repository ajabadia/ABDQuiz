import { useState, useEffect, useCallback, useRef } from 'react';

interface UseQuizTimerProps {
  totalSeconds: number;
  questionSeconds: number;
  onGlobalTimeout: () => void;
  onQuestionTimeout: () => void;
  isPaused?: boolean;
}

export function useQuizTimer({
  totalSeconds,
  questionSeconds,
  onGlobalTimeout,
  onQuestionTimeout,
  isPaused = false
}: UseQuizTimerProps) {
  const [globalTime, setGlobalTime] = useState(totalSeconds);
  const [questionTime, setQuestionTime] = useState(questionSeconds);
  
  const globalTimeoutRef = useRef<boolean>(false);
  const questionTimeoutRef = useRef<boolean>(false);

  // Reset del timer de la pregunta
  const resetQuestionTimer = useCallback(() => {
    setQuestionTime(questionSeconds);
    questionTimeoutRef.current = false;
  }, [questionSeconds]);

  useEffect(() => {
    if (isPaused) return;

    const timer = setInterval(() => {
      let isGlobalDone = false;
      let isQuestionDone = false;

      // 1. Update state first
      if (totalSeconds > 0) {
        setGlobalTime((prev) => {
          if (prev <= 1) {
            isGlobalDone = true;
            return 0;
          }
          return prev - 1;
        });
      }

      if (questionSeconds > 0) {
        setQuestionTime((prev) => {
          if (prev <= 1) {
            isQuestionDone = true;
            return 0;
          }
          return prev - 1;
        });
      }

      // 2. Trigger side effects after state update
      if (isGlobalDone && !globalTimeoutRef.current) {
        globalTimeoutRef.current = true;
        clearInterval(timer);
        onGlobalTimeout();
      }

      if (isQuestionDone && !questionTimeoutRef.current) {
        questionTimeoutRef.current = true;
        onQuestionTimeout();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [onGlobalTimeout, onQuestionTimeout, isPaused, totalSeconds, questionSeconds]);

  return {
    globalTime,
    questionTime,
    resetQuestionTimer,
    isGlobalLow: totalSeconds > 0 && globalTime < 60, // Warning a falta de 1 minuto
    isQuestionLow: questionSeconds > 0 && questionTime < 10, // Warning a falta de 10 segundos
  };
}
