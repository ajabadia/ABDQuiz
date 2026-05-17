'use client';

import { useState, useRef } from 'react';
import { importFinalizedQuestionsAction } from '@/actions/corpus';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Papa from 'papaparse';
import { UploadState } from './ingest/UploadState';
import { RemediationChoiceState } from './ingest/RemediationChoiceState';
import { BulkRemediationState } from './ingest/BulkRemediationState';
import { InteractiveStepsState } from './ingest/InteractiveStepsState';

interface ImportDialogProps {
  onSuccess: () => void;
  onClose: () => void;
}

interface RawQuestion {
  pregunta: string;
  opciones: string[];
  respuesta_correcta: number;
  explicacion?: string;
  modulo?: string;
  fuente?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  tags?: string[];
}

export function ImportDialog({ onSuccess, onClose }: ImportDialogProps) {
  const t = useTranslations('admin');
  const ap = useTranslations('adminPortal');
  
  const [file, setFile] = useState<File | null>(null);
  const [sourceType, setSourceType] = useState<'json' | 'csv'>('json');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [wizardState, setWizardState] = useState<'upload' | 'remediation_choice' | 'bulk_form' | 'interactive_steps'>('upload');
  const [questions, setQuestions] = useState<RawQuestion[]>([]);
  const [incompleteIndices, setIncompleteIndices] = useState<number[]>([]);
  
  const [currentIncompleteIndex, setCurrentIncompleteIndex] = useState<number>(0);
  const [interactiveRemediationData, setInteractiveRemediationData] = useState<Partial<RawQuestion>>({});
  const [bulkData, setBulkData] = useState({ modulo: '', fuente: '', difficulty: 'medium' as 'easy' | 'medium' | 'hard' });

  const isQuestionIncomplete = (q: RawQuestion) => {
    return !q.modulo || q.modulo.trim() === '' || 
           !q.fuente || q.fuente.trim() === '' || 
           !q.difficulty || !['easy', 'medium', 'hard'].includes(q.difficulty);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setSourceType(selectedFile.name.toLowerCase().endsWith('.json') ? 'json' : 'csv');
    }
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
        const map: Record<string, number> = { 'A': 0, 'B': 1, 'C': 2, 'D': 3, 'E': 4, 'F': 5 };
        return map[match[1].toUpperCase()] ?? -1;
      }
    }
    return -1;
  };

  const handleStartParsing = () => {
    if (!file) return;
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        let parsedList: RawQuestion[] = [];

        if (sourceType === 'json') {
          const data = JSON.parse(content);
          parsedList = Array.isArray(data) ? data : [data];
        } else {
          const parseResult = Papa.parse<Record<string, unknown>>(content, { header: true, skipEmptyLines: true, dynamicTyping: true });
          if (parseResult.errors.length > 0) throw new Error(parseResult.errors[0].message);
          parsedList = parseResult.data.map((row) => ({
            pregunta: String(row.pregunta || ''),
            opciones: [row.opcion_a, row.opcion_b, row.opcion_c, row.opcion_d, row.opcion_e, row.opcion_f].map(String).filter(Boolean),
            respuesta_correcta: mapResponseToIndex(String(row.respuesta_correcta || 0)),
            explicacion: String(row.explicacion || ''),
            modulo: String(row.modulo || row.tema || row.category || ''),
            fuente: String(row.fuente || row.source || ''),
            difficulty: mapDifficulty(String(row.difficulty || row.dificultad || row.nivel || ''))
          }));
        }

        const cleaned = parsedList.map(q => ({
          pregunta: q.pregunta || '', opciones: q.opciones || [], respuesta_correcta: q.respuesta_correcta || 0,
          explicacion: q.explicacion || '', modulo: q.modulo || '', fuente: q.fuente || '', difficulty: q.difficulty || 'medium'
        }));

        const incompletes: number[] = [];
        cleaned.forEach((q, idx) => { if (isQuestionIncomplete(q)) incompletes.push(idx); });

        setQuestions(cleaned);
        setIncompleteIndices(incompletes);
        if (incompletes.length > 0) setWizardState('remediation_choice');
        else await submitFinalizedList(cleaned);
      } catch (err: unknown) {
        toast.error('Error al analizar archivo: ' + (err instanceof Error ? err.message : 'Formato no válido'));
      } finally { setIsUploading(false); }
    };
    reader.readAsText(file);
  };

  const submitFinalizedList = async (finalList: RawQuestion[]) => {
    setIsUploading(true);
    try {
      const result = await importFinalizedQuestionsAction(finalList, file?.name || 'import.json');
      if (result.success && result.data) {
        toast.success(t('importSuccess', { count: result.data.validRows }));
        onSuccess();
        onClose();
      } else toast.error(t('importError', { error: result.error || 'Unknown Error' }));
    } catch { toast.error(t('techFailure')); }
    finally { setIsUploading(false); }
  };

  const handleBulkRemediationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const updatedList = questions.map((q) => {
      if (!isQuestionIncomplete(q)) return q;
      return {
        ...q,
        modulo: (!q.modulo || q.modulo.trim() === '') ? bulkData.modulo : q.modulo,
        fuente: (!q.fuente || q.fuente.trim() === '') ? bulkData.fuente : q.fuente,
        difficulty: (!q.difficulty || !['easy', 'medium', 'hard'].includes(q.difficulty)) ? bulkData.difficulty : q.difficulty
      };
    });
    await submitFinalizedList(updatedList);
  };

  const handleNextInteractive = async () => {
    const originalIndex = incompleteIndices[currentIncompleteIndex];
    const updated = [...questions];
    updated[originalIndex] = {
      ...updated[originalIndex],
      modulo: interactiveRemediationData.modulo || 'General',
      fuente: interactiveRemediationData.fuente || 'Manual',
      difficulty: interactiveRemediationData.difficulty || 'medium'
    };
    setQuestions(updated);
    if (currentIncompleteIndex < incompleteIndices.length - 1) {
      const nextIndex = currentIncompleteIndex + 1;
      setCurrentIncompleteIndex(nextIndex);
      const nextQ = updated[incompleteIndices[nextIndex]];
      setInteractiveRemediationData({ modulo: nextQ.modulo || '', fuente: nextQ.fuente || '', difficulty: nextQ.difficulty || 'medium' });
    } else await submitFinalizedList(updated);
  };

  const handleIgnoreAndSubmit = async () => {
    const updated = questions.map((q) => ({
      ...q, modulo: q.modulo && q.modulo.trim() !== '' ? q.modulo : 'General',
      fuente: q.fuente && q.fuente.trim() !== '' ? q.fuente : 'Importación', difficulty: q.difficulty || 'medium'
    }));
    await submitFinalizedList(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="w-full max-w-2xl bg-background border border-white/10 p-8 flex flex-col gap-6 shadow-2xl relative max-h-[90vh] overflow-y-auto rounded-none">
        <button onClick={onClose} aria-label={t('reset')} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-5 h-5" aria-hidden="true" />
        </button>

        {wizardState === 'upload' && (
          <UploadState file={file} sourceType={sourceType} isUploading={isUploading} fileInputRef={fileInputRef} onFileClick={() => fileInputRef.current?.click()} onFileChange={handleFileChange} onStartParsing={handleStartParsing} />
        )}
        {wizardState === 'remediation_choice' && (
          <RemediationChoiceState countIncomplete={incompleteIndices.length} totalCount={questions.length} onBulkChoice={() => setWizardState('bulk_form')} onInteractiveChoice={() => { setCurrentIncompleteIndex(0); const first = questions[incompleteIndices[0]]; setInteractiveRemediationData({ modulo: first.modulo || '', fuente: first.fuente || '', difficulty: first.difficulty || 'medium' }); setWizardState('interactive_steps'); }} onIgnoreChoice={handleIgnoreAndSubmit} />
        )}
        {wizardState === 'bulk_form' && (
          <BulkRemediationState bulkData={bulkData} onDataChange={setBulkData} onSubmit={handleBulkRemediationSubmit} onBack={() => setWizardState('remediation_choice')} isUploading={isUploading} />
        )}
        {wizardState === 'interactive_steps' && (
          <InteractiveStepsState currentIncompleteIndex={currentIncompleteIndex} totalIncomplete={incompleteIndices.length} question={questions[incompleteIndices[currentIncompleteIndex]]} remediationData={interactiveRemediationData} onDataChange={setInteractiveRemediationData} onBack={() => setWizardState('remediation_choice')} onNext={handleNextInteractive} isUploading={isUploading} />
        )}
      </div>
    </div>
  );
}
