'use client';

import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import Papa from 'papaparse';
import { toast } from 'sonner';
import { importFinalizedQuestionsAction } from '@/actions/corpus';

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

  // ── Utilities ──

  const isQuestionIncomplete = (q: RawQuestion) => {
    return (
      !q.modulo ||
      q.modulo.trim() === '' ||
      !q.fuente ||
      q.fuente.trim() === '' ||
      !q.difficulty ||
      !['easy', 'medium', 'hard'].includes(q.difficulty)
    );
  };

  const calcIncompleteIndices = (qs: RawQuestion[]): number[] => {
    const idxs: number[] = [];
    qs.forEach((q, i) => {
      if (isQuestionIncomplete(q)) idxs.push(i);
    });
    return idxs;
  };

  const mapDifficulty = (val: string): 'easy' | 'medium' | 'hard' => {
    const str = val.toLowerCase().trim();
    if (str.includes('fac') || str.includes('eas') || str === '1' || str.includes('baj')) return 'easy';
    if (str.includes('dif') || str.includes('har') || str === '3' || str.includes('alt')) return 'hard';
    return 'medium';
  };

  const mapResponseToIndex = (resp: string | number): number => {
    if (typeof resp === 'number') return resp;
    if (typeof resp === 'string') {
      const match = resp.trim().match(/^([A-F])/i);
      if (match) {
        const map: Record<string, number> = { A: 0, B: 1, C: 2, D: 3, E: 4, F: 5 };
        return map[match[1].toUpperCase()] ?? -1;
      }
    }
    return -1;
  };

  // ── File parsing ──

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setSourceType(selectedFile.name.toLowerCase().endsWith('.json') ? 'json' : 'csv');
    }
  };

  const parseFileContent = (content: string, type: 'json' | 'csv'): RawQuestion[] => {
    let parsedList: RawQuestion[] = [];

    if (type === 'json') {
      const data = JSON.parse(content);
      parsedList = Array.isArray(data) ? data : [data];
    } else {
      const parseResult = Papa.parse<Record<string, unknown>>(content, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
      });
      if (parseResult.errors.length > 0) throw new Error(parseResult.errors[0].message);

      parsedList = parseResult.data.map(row => ({
        pregunta: String(row.pregunta || ''),
        opciones: [row.opcion_a, row.opcion_b, row.opcion_c, row.opcion_d, row.opcion_e, row.opcion_f]
          .map(String)
          .filter(Boolean),
        respuesta_correcta: mapResponseToIndex(String(row.respuesta_correcta || 0)),
        explicacion: String(row.explicacion || ''),
        modulo: String(row.modulo || row.tema || row.category || ''),
        fuente: String(row.fuente || row.source || ''),
        difficulty: mapDifficulty(String(row.difficulty || row.dificultad || row.nivel || '')),
        spaceId: String(row.spaceId || ''),
        courseId: String(row.courseId || ''),
        loadedAt: String(row.loadedAt || ''),
        generatedAt: String(row.generatedAt || ''),
        importVersion: String(row.importVersion || ''),
      }));
    }

    return parsedList.map(q => ({
      pregunta: q.pregunta || '',
      opciones: q.opciones || [],
      respuesta_correcta: q.respuesta_correcta || 0,
      explicacion: q.explicacion || '',
      modulo: q.modulo || '',
      fuente: q.fuente || '',
      difficulty: q.difficulty || 'medium',
      spaceId: q.spaceId || undefined,
      courseId: q.courseId || undefined,
      loadedAt: q.loadedAt || undefined,
      generatedAt: q.generatedAt || undefined,
      importVersion: q.importVersion || undefined,
    }));
  };

  /** Lee el archivo y retorna las preguntas parseadas */
  const readAndParseFile = async (): Promise<RawQuestion[]> => {
    if (!file) throw new Error('No file selected');
    const content = await file.text();
    return parseFileContent(content, sourceType);
  };

  // ── Submission ──

  const submitFinalizedList = async (finalList: RawQuestion[]): Promise<void> => {
    setIsUploading(true);
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
      loading: t('techProcessing', { defaultMessage: 'Procesando preguntas...' }),
      success: data => t('importSuccess', { count: data.validRows }),
      error: (err: Error) => err.message || t('techFailure'),
    });

    await promise.catch(() => {});
    setIsUploading(false);
  };

  // ── Remediation handlers ──

  const handleBulkRemediationSubmit = async (e: React.FormEvent, qs: RawQuestion[]) => {
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
    await submitFinalizedList(updatedList);
  };

  const handleNextInteractive = async (qs: RawQuestion[]) => {
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
      const nextIndex = currentIncompleteIndex + 1;
      setCurrentIncompleteIndex(nextIndex);
      const nextQ = updated[incompleteIndices[nextIndex]];
      setInteractiveRemediationData({
        modulo: nextQ.modulo || '',
        fuente: nextQ.fuente || '',
        difficulty: nextQ.difficulty || 'medium',
      });
    } else {
      await submitFinalizedList(updated);
    }
  };

  const handleIgnoreAndSubmit = async (qs: RawQuestion[]) => {
    const updated = qs.map(q => ({
      ...q,
      modulo: q.modulo && q.modulo.trim() !== '' ? q.modulo : 'General',
      fuente: q.fuente && q.fuente.trim() !== '' ? q.fuente : 'Importación',
      difficulty: q.difficulty || 'medium',
    }));
    await submitFinalizedList(updated);
  };

  const initInteractiveFrom = (index: number, qs: RawQuestion[]) => {
    setCurrentIncompleteIndex(0);
    const first = qs[incompleteIndices[0]];
    setInteractiveRemediationData({
      modulo: first.modulo || '',
      fuente: first.fuente || '',
      difficulty: first.difficulty || 'medium',
    });
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
