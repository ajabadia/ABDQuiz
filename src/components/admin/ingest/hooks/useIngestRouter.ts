/**
 * @purpose Gestiona el manejo de rutas y estado para la ingestión de preguntas en la interfaz administrativa ABDQuiz.
 * @purpose_en Manages the routing and state management for question ingestion in the ABDQuiz admin interface.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Custom Hook
 * @complexity Medium
 * @fingerprint exports:1,imports:4,sig:1l6c9kq
 * @lastUpdated 2026-06-23T17:41:53.677Z
 */

import { useCallback, type Dispatch, type SetStateAction } from 'react';
import type { RawQuestion, ConflictPair } from '../types';
import type { WizardState as WizardStateValue } from './useIngestWizard';
import type { ConflictInfo } from './useHierarchyResolution';

// ── Types for the hooks we consume ──

interface WizardState {
  wizardState: WizardStateValue;
  setWizardState: Dispatch<SetStateAction<WizardStateValue>>;
  file: File | null;
  questions: RawQuestion[];
  setQuestions: Dispatch<SetStateAction<RawQuestion[]>>;
  incompleteIndices: number[];
  setIncompleteIndices: Dispatch<SetStateAction<number[]>>;
  readAndParseFile: () => Promise<RawQuestion[]>;
  calcIncompleteIndices: (qs: RawQuestion[]) => number[];
  submitFinalizedList: (qs: RawQuestion[]) => Promise<void>;
}

interface ConflictsState {
  contentConflicts: ConflictPair[];
  resolvedConflictCount: number;
  detectConflicts: (qs: RawQuestion[]) => void;
  handleContentConflictResolution: (resolution: {
    pairIndex: number;
    action: 'keep_both' | 'skip_second';
  }) => void;
  getFilteredQuestions: (qs: RawQuestion[]) => RawQuestion[];
  redetectOnFiltered: (qs: RawQuestion[]) => RawQuestion[];
}

interface HierarchyState {
  hierarchyConflicts: ConflictInfo[];
  setHierarchyConflicts: Dispatch<SetStateAction<ConflictInfo[]>>;
  needsContextCount: number;
  setNeedsContextCount: Dispatch<SetStateAction<number>>;
  validateHierarchy: (qs: RawQuestion[]) => Promise<ConflictInfo[]>;
  countMissingIds: (qs: RawQuestion[]) => number;
  applyContextToQuestions: (qs: RawQuestion[], ctx: { spaceId: string; courseId?: string }) => RawQuestion[];
  applyRememberedResolution: (
    qs: RawQuestion[],
    conflicts: ConflictInfo[],
    resolution: { spaceId: string; courseId?: string; nullifyCourse: boolean; remember: boolean }
  ) => RawQuestion[];
  resolveSingleConflict: (
    qs: RawQuestion[],
    conflict: ConflictInfo,
    resolution: { spaceId: string; courseId?: string; nullifyCourse: boolean; remember: boolean }
  ) => RawQuestion[];
}

export function useIngestRouter(
  wizard: WizardState,
  conflicts: ConflictsState,
  hierarchy: HierarchyState
) {
  const routeAfterConflicts = useCallback(
    async (qs: RawQuestion[], incompletes: number[]) => {
      conflicts.detectConflicts(qs);

      if (conflicts.contentConflicts.length > 0) {
        wizard.setWizardState('remediation_conflicts');
      } else if (incompletes.length > 0) {
        wizard.setWizardState('remediation_choice');
      } else {
        await wizard.submitFinalizedList(qs);
      }
    },
    [conflicts, wizard]
  );

  const validateAndRoute = useCallback(
    async (qs: RawQuestion[], incompletes: number[]) => {
      const hConflicts = await hierarchy.validateHierarchy(qs);
      hierarchy.setHierarchyConflicts(hConflicts);

      if (hConflicts.length > 0) {
        wizard.setWizardState('remediation_ids');
        return;
      }
      await routeAfterConflicts(qs, incompletes);
    },
    [hierarchy, routeAfterConflicts, wizard]
  );

  const handleStartParsing = useCallback(async () => {
    const { file } = wizard;
    if (!file) return;
    wizard.setWizardState('upload');
    try {
      const parsed = await wizard.readAndParseFile();
      const incompletes = wizard.calcIncompleteIndices(parsed);

      wizard.setQuestions(parsed);
      wizard.setIncompleteIndices(incompletes);
      conflicts.detectConflicts(parsed);

      const missingCount = hierarchy.countMissingIds(parsed);
      hierarchy.setNeedsContextCount(missingCount);

      if (missingCount > 0) {
        wizard.setWizardState('select_context');
        return;
      }

      await validateAndRoute(parsed, incompletes);
    } catch {
      wizard.setWizardState('upload');
    }
  }, [wizard, conflicts, hierarchy, validateAndRoute]);

  const handleContextSelection = useCallback(
    async (context: { spaceId: string; courseId?: string }) => {
      const updated = hierarchy.applyContextToQuestions(wizard.questions, context);
      wizard.setQuestions(updated);
      hierarchy.setNeedsContextCount(0);

      const incompletes = wizard.calcIncompleteIndices(updated);
      wizard.setIncompleteIndices(incompletes);
      await validateAndRoute(updated, incompletes);
    },
    [hierarchy, wizard, validateAndRoute]
  );

  const handleSkipContext = useCallback(async () => {
    hierarchy.setNeedsContextCount(0);
    const incompletes = wizard.calcIncompleteIndices(wizard.questions);
    wizard.setIncompleteIndices(incompletes);

    if (incompletes.length > 0) {
      wizard.setWizardState('remediation_choice');
    } else {
      await wizard.submitFinalizedList(wizard.questions);
    }
  }, [hierarchy, wizard]);

  const handleHierarchyResolution = useCallback(
    async (resolution: {
      spaceId: string;
      courseId?: string;
      nullifyCourse: boolean;
      remember: boolean;
    }) => {
      const currentConflict = hierarchy.hierarchyConflicts[0] as
        | ConflictInfo
        | undefined;
      if (!currentConflict) return;

      let updated: RawQuestion[];

      if (resolution.remember && hierarchy.hierarchyConflicts.length > 1) {
        updated = hierarchy.applyRememberedResolution(
          wizard.questions,
          hierarchy.hierarchyConflicts,
          resolution
        );
        wizard.setQuestions(updated);
        hierarchy.setHierarchyConflicts([]);

        const incompletes = wizard.calcIncompleteIndices(updated);
        wizard.setIncompleteIndices(incompletes);

        if (incompletes.length > 0) wizard.setWizardState('remediation_choice');
        else await wizard.submitFinalizedList(updated);
        return;
      }

      updated = hierarchy.resolveSingleConflict(wizard.questions, currentConflict, resolution);
      wizard.setQuestions(updated);

      const remaining = hierarchy.hierarchyConflicts.slice(1);
      hierarchy.setHierarchyConflicts(remaining);

      if (remaining.length === 0) {
        const incompletes = wizard.calcIncompleteIndices(updated);
        wizard.setIncompleteIndices(incompletes);
        await routeAfterConflicts(updated, incompletes);
      }
    },
    [hierarchy, wizard, routeAfterConflicts]
  );

  const handleContinueAfterAllResolved = useCallback(async () => {
    const filtered = conflicts.getFilteredQuestions(wizard.questions);
    const updated = conflicts.redetectOnFiltered(filtered);
    wizard.setQuestions(updated);

    const incompletes = wizard.calcIncompleteIndices(updated);
    wizard.setIncompleteIndices(incompletes);

    if (incompletes.length > 0) {
      wizard.setWizardState('remediation_choice');
    } else {
      await wizard.submitFinalizedList(updated);
    }
  }, [conflicts, wizard]);

  return {
    validateAndRoute,
    routeAfterConflicts,
    handleStartParsing,
    handleContextSelection,
    handleSkipContext,
    handleHierarchyResolution,
    handleContinueAfterAllResolved,
  };
}
