import { useState, useEffect, useCallback, useRef } from 'react';

interface UseQuizTimerProps {
  totalSeconds: number;
  questionSeconds: number;
  onGlobalTimeout: () => void;
  onQuestionTimeout: () => void;
}

export function useQuizTimer({
  totalSeconds,
  questionSeconds,
  onGlobalTimeout,
  onQuestionTimeout,
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
    const timer = setInterval(() => {
      let isGlobalDone = false;
      let isQuestionDone = false;

      // 1. Update state first
      setGlobalTime((prev) => {
        if (prev <= 1) {
          isGlobalDone = true;
          return 0;
        }
        return prev - 1;
      });

      setQuestionTime((prev) => {
        if (prev <= 1) {
          isQuestionDone = true;
          return 0;
        }
        return prev - 1;
      });

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
  }, [onGlobalTimeout, onQuestionTimeout]);

  return {
    globalTime,
    questionTime,
    resetQuestionTimer,
    isGlobalLow: globalTime < 60, // Warning a falta de 1 minuto
    isQuestionLow: questionTime < 10, // Warning a falta de 10 segundos
  };
}
