'use client';

import { useState, useEffect, useRef } from 'react';
import { generateQuestionFeedbackAction } from '@/actions/feedback';

export function useAIFeedback(
  showFeedback: boolean,
  currentIndex: number,
  attemptId: string,
) {
  const [aiFeedbackMap, setAiFeedbackMap] = useState<Record<number, string>>({});
  const [aiFeedbackLoading, setAiFeedbackLoading] = useState<Record<number, boolean>>({});
  const requestedRef = useRef<Set<string>>(new Set());

  // Trigger AI feedback generation when showFeedback becomes true
  useEffect(() => {
    if (!showFeedback) return;

    const key = `${attemptId}:${currentIndex}`;
    if (requestedRef.current.has(key)) return;
    requestedRef.current.add(key);

    setAiFeedbackLoading(prev => ({ ...prev, [currentIndex]: true }));

    generateQuestionFeedbackAction(attemptId, currentIndex)
      .then(res => {
        if (res.success && res.feedback) {
          setAiFeedbackMap(prev => ({ ...prev, [currentIndex]: res.feedback! }));
        }
      })
      .catch(() => {
        // Silently fail — the UI will show the error state in QuizQuestion
      })
      .finally(() => {
        setAiFeedbackLoading(prev => ({ ...prev, [currentIndex]: false }));
      });
  }, [showFeedback, currentIndex, attemptId]);

  return { aiFeedbackMap, aiFeedbackLoading };
}
