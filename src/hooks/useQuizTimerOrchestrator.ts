'use client';

/**
 * @purpose Gestiona los temporizadores de preguntas y temporizadores globales, proporcionando acceso sincronizado a estados del temporizador.
 * @purpose_en Orchestrates quiz timers by managing global and question timeouts, providing synchronized access to timer states.
 * @refactorable false
 * @classification Custom Hook
 * @complexity Medium
 * @fingerprint exports:1,imports:2,sig:sa5ekk
 * @lastUpdated 2026-06-23T23:22:24.470Z
 */

import { useEffect } from 'react';
import { useQuizTimer } from './useQuizTimer';

interface UseQuizTimerOrchestratorProps {
  totalSeconds: number;
  questionSeconds: number;
  onGlobalTimeout: () => void;
  onQuestionTimeout: () => void;
  isPaused: boolean;
  resetTimerRef: React.MutableRefObject<() => void>;
}

/**
 * Orquestador de temporizadores.
 *
 * Encapsula useQuizTimer + la sincronización del ref compartido que rompe la
 * dependencia circular:
 *
 *   useQuizNavigation ← resetTimerRef (creado externamente) ───┐
 *                                                              │ (sync via useEffect)
 *   useQuizTimer ── resetQuestionTimer ─────────────────────────┘
 *
 * El ref se recibe desde el padre (QuizInterface), se crea ANTES de
 * que cualquier consumidor lo use, y se sincroniza DESPUÉS mediante
 * el useEffect interno con el último resetQuestionTimer.
 */
export function useQuizTimerOrchestrator({
  totalSeconds,
  questionSeconds,
  onGlobalTimeout,
  onQuestionTimeout,
  isPaused,
  resetTimerRef,
}: UseQuizTimerOrchestratorProps) {
  const { globalTime, questionTime, isGlobalLow, isQuestionLow, resetQuestionTimer } = useQuizTimer({
    totalSeconds,
    questionSeconds,
    onGlobalTimeout,
    onQuestionTimeout,
    isPaused,
  });

  // Sync ref con el último resetQuestionTimer en cada render
  useEffect(() => {
    resetTimerRef.current = resetQuestionTimer;
  }, [resetQuestionTimer]);

  return {
    globalTime,
    questionTime,
    isGlobalLow,
    isQuestionLow,
  };
}
