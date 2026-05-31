'use client';

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
