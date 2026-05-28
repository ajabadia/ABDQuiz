'use client';

import { useState } from 'react';
import type { ConflictPair } from '../types';
import { detectBatchConflicts } from '@/lib/corpus/conflictDetector';

interface RawQuestion {
  pregunta: string;
  opciones: string[];
  respuesta_correcta: number;
  explicacion?: string;
  modulo?: string;
  fuente?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  tags?: string[];
  spaceId?: string;
  courseId?: string;
  loadedAt?: string;
  generatedAt?: string;
  importVersion?: string;
}

export function useContentConflicts() {
  const [contentConflicts, setContentConflicts] = useState<ConflictPair[]>([]);
  const [resolvedConflictCount, setResolvedConflictCount] = useState(0);
  const [skippedIndices, setSkippedIndices] = useState<Set<number>>(new Set());

  /** Analiza el lote y actualiza los conflictos de contenido */
  const detectConflicts = (questions: RawQuestion[]) => {
    const batchConflicts = detectBatchConflicts(questions);
    setContentConflicts(batchConflicts.conflicts);
    setResolvedConflictCount(0);
    setSkippedIndices(new Set());
  };

  /** Resuelve un par de conflicto (conservar ambos / saltar segundo) */
  const handleContentConflictResolution = (resolution: {
    pairIndex: number;
    action: 'keep_both' | 'skip_second';
  }) => {
    const conflict = contentConflicts[resolution.pairIndex];
    if (!conflict) return;

    if (resolution.action === 'skip_second') {
      setSkippedIndices(prev => new Set([...prev, conflict.indexB]));
    }

    setResolvedConflictCount(prev => prev + 1);
  };

  /** Filtra las preguntas saltadas del listado */
  const getFilteredQuestions = (questions: RawQuestion[]): RawQuestion[] => {
    return questions.filter((_, idx) => !skippedIndices.has(idx));
  };

  /** Recalcula conflictos sobre un listado filtrado */
  const redetectOnFiltered = (questions: RawQuestion[]) => {
    const filtered = getFilteredQuestions(questions);
    const batchConflicts = detectBatchConflicts(filtered);
    setContentConflicts(batchConflicts.conflicts);
    setResolvedConflictCount(0);
    setSkippedIndices(new Set());
    return filtered;
  };

  return {
    contentConflicts,
    resolvedConflictCount,
    skippedIndices,
    detectConflicts,
    handleContentConflictResolution,
    getFilteredQuestions,
    redetectOnFiltered,
    setContentConflicts,
    setResolvedConflictCount,
  };
}
