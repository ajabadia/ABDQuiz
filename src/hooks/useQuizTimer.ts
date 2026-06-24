/**
 * @purpose Gestiona y sigue el tiempo global y de preguntas para un quiz, reiniciando el temporizador de pregunta cuando sea necesario y desencadenando llamadas de callback en tiempos de vencimiento.
 * @purpose_en Manages and tracks the global and question timers for a quiz, resetting the question timer when necessary and triggering callbacks on timeouts.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Custom Hook
 * @complexity Medium
 * @fingerprint exports:1,imports:1,sig:13ahonk
 * @lastUpdated 2026-06-23T23:22:19.837Z
 */

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseQuizTimerProps {
  totalSeconds: number;
  questionSeconds: number;
  onGlobalTimeout: () => void;
  onQuestionTimeout: () => void;
  isPaused?: boolean;
}

/**
 * useQuizTimer
 *
 * Hook de temporización que maneja dos contadores simultáneamente:
 * - globalTime: tiempo total del examen
 * - questionTime: tiempo por pregunta
 *
 * Usa refs (globalTimeRef, questionTimeRef) como almacenamiento síncrono
 * para la detección de timeouts dentro del callback de setInterval,
 * evitando depender de la ejecución de updaters de useState que React 18
 * puede diferir por batching.
 */
export function useQuizTimer({
  totalSeconds,
  questionSeconds,
  onGlobalTimeout,
  onQuestionTimeout,
  isPaused = false
}: UseQuizTimerProps) {
  const [globalTime, setGlobalTime] = useState(totalSeconds);
  const [questionTime, setQuestionTime] = useState(questionSeconds);

  // Refs para acceso síncrono desde el intervalo (evita side effects en updaters)
  const globalTimeRef = useRef(totalSeconds);
  const questionTimeRef = useRef(questionSeconds);
  const globalTimeoutRef = useRef(false);
  const questionTimeoutRef = useRef(false);

  const resetQuestionTimer = useCallback(() => {
    setQuestionTime(questionSeconds);
    questionTimeRef.current = questionSeconds;
    questionTimeoutRef.current = false;
  }, [questionSeconds]);

  const onGlobalTimeoutRef = useRef(onGlobalTimeout);
  const onQuestionTimeoutRef = useRef(onQuestionTimeout);

  useEffect(() => {
    onGlobalTimeoutRef.current = onGlobalTimeout;
    onQuestionTimeoutRef.current = onQuestionTimeout;
  }, [onGlobalTimeout, onQuestionTimeout]);

  useEffect(() => {
    if (isPaused) return;

    const timer = setInterval(() => {
      // 1. Computar siguiente valor y actualizar ref + state
      if (totalSeconds > 0) {
        const next = Math.max(0, globalTimeRef.current - 1);
        globalTimeRef.current = next;
        setGlobalTime(next);
      }

      if (questionSeconds > 0) {
        const next = Math.max(0, questionTimeRef.current - 1);
        questionTimeRef.current = next;
        setQuestionTime(next);
      }

      // 2. Detectar timeouts — los refs ya tienen los valores actualizados.
      //    Los guards (totalSeconds > 0 / questionSeconds > 0) evitan que
      //    timeouts se disparen cuando el contador correspondiente es 0
      //    (ej: totalSeconds=0 → globalTimeRef se queda en 0 inicial).
      if (totalSeconds > 0 && globalTimeRef.current === 0 && !globalTimeoutRef.current) {
        globalTimeoutRef.current = true;
        clearInterval(timer);
        onGlobalTimeoutRef.current();
      }

      if (questionSeconds > 0 && questionTimeRef.current === 0 && !questionTimeoutRef.current) {
        questionTimeoutRef.current = true;
        onQuestionTimeoutRef.current();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isPaused, totalSeconds, questionSeconds]);

  return {
    globalTime,
    questionTime,
    resetQuestionTimer,
    isGlobalLow: totalSeconds > 0 && globalTime < 60,
    isQuestionLow: questionSeconds > 0 && questionTime < 10,
  };
}
