'use client';

/**
 * @purpose Gestiona el envío de latidos cardíacos al servidor cada 30 segundos mientras se está intentando una prueba de quiz, deteniéndose automáticamente si el servidor informa que la prueba ha terminado.
 * @purpose_en Manages sending heartbeats to the server every 30 seconds while a quiz attempt is active, stopping automatically if the server reports that the attempt has ended.
 * @refactorable false
 * @classification Custom Hook
 * @complexity Low
 * @fingerprint exports:1,imports:2,sig:pbjg88
 * @lastUpdated 2026-06-23T23:22:08.241Z
 */

import { useEffect, useRef } from 'react';
import { heartbeatAction } from '@/actions/quiz';

/**
 * §12.D — Anti-clock tampering: envía heartbeats cada 30s mientras el
 * examen está activo. Se detiene automáticamente si el servidor reporta
 * que el intento ya finalizó.
 */
export function useQuizHeartbeat(attemptId: string) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Send heartbeat immediately on mount
    heartbeatAction(attemptId).catch(() => {});

    // Then every 30 seconds
    intervalRef.current = setInterval(() => {
      heartbeatAction(attemptId)
        .then((result) => {
          if (result && 'attemptEnded' in result && result.attemptEnded) {
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
          }
        })
        .catch(() => {});
    }, 30_000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [attemptId]);
}
