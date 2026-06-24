'use client';

/**
 * @purpose Valida y resuelve conflictos en el espacio de jerarquía spaceId/courseId de cada pregunta contra el backend.
 * @purpose_en Validates the hierarchy spaceId/courseId of each question against the backend and resolves conflicts.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Custom Hook
 * @complexity Medium
 * @fingerprint exports:2,imports:2,sig:1xadsco
 * @lastUpdated 2026-06-23T23:21:36.608Z
 */

import { useState } from 'react';
import { validateHierarchyAction } from '@/actions/hierarchyValidation';

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

export interface ConflictInfo {
  index: number;
  pregunta: string;
  spaceId?: string;
  courseId?: string;
  errorType?: string;
  spaceName?: string;
  courseName?: string;
}

export function useHierarchyResolution() {
  const [hierarchyConflicts, setHierarchyConflicts] = useState<ConflictInfo[]>([]);
  const [needsContextCount, setNeedsContextCount] = useState(0);

  /** Valida la jerarquía spaceId/courseId de cada pregunta contra el backend */
  const validateHierarchy = async (questions: RawQuestion[]): Promise<ConflictInfo[]> => {
    const conflicts: ConflictInfo[] = [];
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.spaceId && !q.courseId) continue;

      if (q.spaceId) {
        try {
          const validation = await validateHierarchyAction(q.spaceId, q.courseId);
          if (validation.success && validation.data) {
            const v = validation.data;
            if (!v.valid) {
              conflicts.push({
                index: i,
                pregunta: q.pregunta,
                spaceId: q.spaceId,
                courseId: q.courseId,
                errorType: v.errorType,
                spaceName: v.spaceName,
                courseName: v.courseName,
              });
            }
          }
        } catch {
          conflicts.push({
            index: i,
            pregunta: q.pregunta,
            spaceId: q.spaceId,
            courseId: q.courseId,
            errorType: 'space_not_found',
          });
        }
      }
    }
    return conflicts;
  };

  /** Cuenta preguntas sin spaceId ni courseId */
  const countMissingIds = (questions: RawQuestion[]): number => {
    return questions.filter(q => !q.spaceId && !q.courseId).length;
  };

  /** Asigna espacio/curso a preguntas que no tienen IDs */
  const applyContextToQuestions = (
    questions: RawQuestion[],
    context: { spaceId: string; courseId?: string }
  ): RawQuestion[] => {
    return questions.map(q => ({
      ...q,
      spaceId: !q.spaceId && !q.courseId ? context.spaceId : q.spaceId,
      courseId: !q.spaceId && !q.courseId ? context.courseId : q.courseId,
    }));
  };

  /** Resuelve un conflicto individual y retorna el listado actualizado */
  const resolveSingleConflict = (
    questions: RawQuestion[],
    currentConflict: ConflictInfo,
    resolution: { spaceId: string; courseId?: string; nullifyCourse: boolean }
  ): RawQuestion[] => {
    const updated = [...questions];
    updated[currentConflict.index] = {
      ...updated[currentConflict.index],
      spaceId: resolution.spaceId,
      courseId: resolution.nullifyCourse ? undefined : resolution.courseId,
    };
    return updated;
  };

  /** Aplica una resolución recordada a todos los conflictos restantes */
  const applyRememberedResolution = (
    questions: RawQuestion[],
    conflicts: ConflictInfo[],
    resolution: { spaceId: string; courseId?: string; nullifyCourse: boolean }
  ): RawQuestion[] => {
    const updated = [...questions];
    for (const conflict of conflicts) {
      updated[conflict.index] = {
        ...updated[conflict.index],
        spaceId: resolution.spaceId,
        courseId: resolution.nullifyCourse ? undefined : resolution.courseId,
      };
    }
    return updated;
  };

  return {
    hierarchyConflicts,
    setHierarchyConflicts,
    needsContextCount,
    setNeedsContextCount,
    validateHierarchy,
    countMissingIds,
    applyContextToQuestions,
    resolveSingleConflict,
    applyRememberedResolution,
  };
}
