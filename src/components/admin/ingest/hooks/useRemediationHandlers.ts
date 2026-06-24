'use client';

/**
 * @purpose Gestiona la presentación y corrección de preguntas finalizadas, maneja diversas interacciones de los usuarios y actualiza los datos de las preguntas según sea necesario.
 * @purpose_en Manages the submission and remediation of finalized questions, handling various user interactions and updating question data accordingly.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Custom Hook
 * @complexity Medium
 * @fingerprint exports:5,imports:4,sig:ckl1sc
 * @lastUpdated 2026-06-23T17:42:04.884Z
 */

import { toast } from 'sonner';
import { importFinalizedQuestionsAction } from '@/actions/corpus';
import type { RawQuestion, BulkData } from './useIngestWizard';
import { isQuestionIncomplete } from './useFileParser';

interface TranslatedLabels {
  techProcessing: string;
  importSuccess: string;
  techFailure: string;
}

export function submitFinalizedList(
  finalList: RawQuestion[],
  file: File | null,
  onSuccess: () => void,
  onClose: () => void,
  labels: TranslatedLabels,
): Promise<{ validRows: number } | void> {
  const promise = importFinalizedQuestionsAction(finalList, file?.name || 'import.json')
    .then(result => {
      if (result.success && result.data) {
        onSuccess();
        onClose();
        return result.data;
      }
      throw new Error(result.error || 'Unknown Error');
    });

  toast.promise(promise, {
    loading: labels.techProcessing,
    success: (data: { validRows: number }) => labels.importSuccess.replace('{count}', String(data.validRows)),
    error: (err: Error) => err.message || labels.techFailure,
  });

  return promise.catch(() => {});
}

export function handleBulkRemediationSubmit(
  e: React.FormEvent,
  qs: RawQuestion[],
  bulkData: BulkData,
  file: File | null,
  onSuccess: () => void,
  onClose: () => void,
  labels: TranslatedLabels,
): Promise<{ validRows: number } | void> {
  e.preventDefault();
  const updatedList = qs.map(q => {
    if (!isQuestionIncomplete(q)) return q;
    return {
      ...q,
      modulo: !q.modulo || q.modulo.trim() === '' ? bulkData.modulo : q.modulo,
      fuente: !q.fuente || q.fuente.trim() === '' ? bulkData.fuente : q.fuente,
      difficulty:
        !q.difficulty || !['easy', 'medium', 'hard'].includes(q.difficulty)
          ? bulkData.difficulty
          : q.difficulty,
    };
  });
  return submitFinalizedList(updatedList, file, onSuccess, onClose, labels);
}

export function handleNextInteractive(
  qs: RawQuestion[],
  incompleteIndices: number[],
  currentIncompleteIndex: number,
  interactiveRemediationData: Partial<RawQuestion>,
  file: File | null,
  onSuccess: () => void,
  onClose: () => void,
  setQuestions: (qs: RawQuestion[]) => void,
  setCurrentIncompleteIndex: (idx: number) => void,
  setInteractiveRemediationData: (data: Partial<RawQuestion>) => void,
  labels: TranslatedLabels,
): Promise<{ validRows: number } | void> {
  const originalIndex = incompleteIndices[currentIncompleteIndex];
  const updated = [...qs];
  updated[originalIndex] = {
    ...updated[originalIndex],
    modulo: interactiveRemediationData.modulo || 'General',
    fuente: interactiveRemediationData.fuente || 'Manual',
    difficulty: interactiveRemediationData.difficulty || 'medium',
  };
  setQuestions(updated);

  if (currentIncompleteIndex < incompleteIndices.length - 1) {
    const nextIdx = currentIncompleteIndex + 1;
    setCurrentIncompleteIndex(nextIdx);
    const nextQ = updated[incompleteIndices[nextIdx]];
    setInteractiveRemediationData({
      modulo: nextQ.modulo || '',
      fuente: nextQ.fuente || '',
      difficulty: nextQ.difficulty || 'medium',
    });
    return Promise.resolve();
  } else {
    return submitFinalizedList(updated, file, onSuccess, onClose, labels);
  }
}

export function handleIgnoreAndSubmit(
  qs: RawQuestion[],
  file: File | null,
  onSuccess: () => void,
  onClose: () => void,
  labels: TranslatedLabels,
): Promise<{ validRows: number } | void> {
  const updated = qs.map(q => ({
    ...q,
    modulo: q.modulo && q.modulo.trim() !== '' ? q.modulo : 'General',
    fuente: q.fuente && q.fuente.trim() !== '' ? q.fuente : 'Importación',
    difficulty: q.difficulty || 'medium',
  }));
  return submitFinalizedList(updated, file, onSuccess, onClose, labels);
}

export function initInteractiveFrom(
  incompleteIndices: number[],
  qs: RawQuestion[],
  setCurrentIncompleteIndex: (idx: number) => void,
  setInteractiveRemediationData: (data: Partial<RawQuestion>) => void,
) {
  setCurrentIncompleteIndex(0);
  const first = qs[incompleteIndices[0]];
  setInteractiveRemediationData({
    modulo: first.modulo || '',
    fuente: first.fuente || '',
    difficulty: first.difficulty || 'medium',
  });
}
