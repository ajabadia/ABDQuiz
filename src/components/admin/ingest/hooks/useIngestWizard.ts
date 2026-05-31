'use client';

import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { importFinalizedQuestionsAction } from '@/actions/corpus';
import { parseFileContent, isQuestionIncomplete, calcIncompleteIndices } from './useFileParser';
import {
  submitFinalizedList as submitList,
  handleBulkRemediationSubmit as bulkSubmit,
  handleNextInteractive as nextInteractive,
  handleIgnoreAndSubmit as ignoreSubmit,
  initInteractiveFrom as initInteractive,
} from './useRemediationHandlers';

// ── Tipos compartidos ──

export type WizardState =
  | 'upload'
  | 'select_context'
  | 'remediation_ids'
  | 'remediation_conflicts'
  | 'remediation_choice'
  | 'bulk_form'
  | 'interactive_steps';

export interface RawQuestion {
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

export interface BulkData {
  modulo: string;
  fuente: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

// ── Hook ──

export function useIngestWizard(onSuccess: () => void, onClose: () => void) {
  const t = useTranslations('admin');

  // Wizard state
  const [wizardState, setWizardState] = useState<WizardState>('upload');

  // File state
  const [file, setFile] = useState<File | null>(null);
  const [sourceType, setSourceType] = useState<'json' | 'csv'>('json');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Question state
  const [questions, setQuestions] = useState<RawQuestion[]>([]);
  const [incompleteIndices, setIncompleteIndices] = useState<number[]>([]);

  // Interactive remediation state
  const [currentIncompleteIndex, setCurrentIncompleteIndex] = useState<number>(0);
  const [interactiveRemediationData, setInteractiveRemediationData] = useState<Partial<RawQuestion>>({});
  const [bulkData, setBulkData] = useState<BulkData>({
    modulo: '',
    fuente: '',
    difficulty: 'medium',
  });

  // ── File handling ──

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setSourceType(selectedFile.name.toLowerCase().endsWith('.json') ? 'json' : 'csv');
    }
  };

  /** Lee el archivo y retorna las preguntas parseadas */
  const readAndParseFile = async (): Promise<RawQuestion[]> => {
    if (!file) throw new Error('No file selected');
    const content = await file.text();
    return parseFileContent(content, sourceType);
  };

  // ── Submission ──

  const labels = {
    techProcessing: t('techProcessing'),
    importSuccess: t('importSuccess', { count: 0 }),
    techFailure: t('techFailure'),
  };

  const submitFinalizedList = async (finalList: RawQuestion[]): Promise<void> => {
    await submitList(finalList, file, onSuccess, onClose, labels);
  };

  // ── Remediation handlers ──

  const handleBulkRemediationSubmit = async (e: React.FormEvent, qs: RawQuestion[]) => {
    await bulkSubmit(e, qs, bulkData, file, onSuccess, onClose, labels);
  };

  const handleNextInteractive = async (qs: RawQuestion[]) => {
    await nextInteractive(
      qs, incompleteIndices, currentIncompleteIndex, interactiveRemediationData,
      file, onSuccess, onClose, setQuestions, setCurrentIncompleteIndex, setInteractiveRemediationData, labels
    );
  };

  const handleIgnoreAndSubmit = async (qs: RawQuestion[]) => {
    await ignoreSubmit(qs, file, onSuccess, onClose, labels);
  };

  const initInteractiveFrom = (index: number, qs: RawQuestion[]) => {
    initInteractive(incompleteIndices, qs, setCurrentIncompleteIndex, setInteractiveRemediationData);
  };

  return {
    // State
    wizardState,
    setWizardState,
    file,
    sourceType,
    isUploading,
    fileInputRef,
    questions,
    setQuestions,
    incompleteIndices,
    setIncompleteIndices,
    currentIncompleteIndex,
    setCurrentIncompleteIndex,
    interactiveRemediationData,
    setInteractiveRemediationData,
    bulkData,
    setBulkData,

    // Utilities
    isQuestionIncomplete,
    calcIncompleteIndices,
    handleFileChange,
    readAndParseFile,

    // Submission
    submitFinalizedList,

    // Remediation
    handleBulkRemediationSubmit,
    handleNextInteractive,
    handleIgnoreAndSubmit,
    initInteractiveFrom,
  };
}
