'use client';

/**
 * @purpose Gestiona el rendimiento y la funcionalidad de un modal para editar preguntas de quiz, incluyendo manejo del estado de formulario, subidas de archivos y guardado de cambios.
 * @purpose_en Manages the rendering and functionality of a modal for editing quiz questions, including form state management, file uploads, and saving changes.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:7,sig:159s47m
 * @lastUpdated 2026-06-23T19:48:39.297Z
 */

import { LabeledField } from '@ajabadia/styles';
import { useState, useEffect, useRef } from 'react';
import { checkQuestionTraceabilityAction, saveQuestionAction } from '@/actions/question';
import { toast } from 'sonner';
import { X, AlertTriangle, CheckCircle, ShieldCheck, Paperclip, Upload, Loader2, Trash2, ExternalLink } from 'lucide-react';
import { useId } from 'react';
import { useTranslations } from 'next-intl';

interface Attachment {
  url: string;
  name: string;
  type: string;
  size: number;
}

interface QuestionItem {
  _id: string;
  questionText: string;
  module: string;
  source: string;
  difficulty: 'easy' | 'medium' | 'hard';
  active: boolean;
  version: number;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
  tags: string[];
  attachments?: Attachment[];
}

interface QuestionEditorModalProps {
  question: QuestionItem;
  onClose: () => void;
  onSuccess: () => void;
}

export function QuestionEditorModal({ question, onClose, onSuccess }: QuestionEditorModalProps) {
  const t = useTranslations('questions');
  const formId = useId();
  const [hasBeenAnswered, setHasBeenAnswered] = useState<boolean | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    questionText: question.questionText,
    options: [...question.options],
    correctOptionIndex: question.correctOptionIndex,
    explanation: question.explanation || '',
    difficulty: question.difficulty,
    module: question.module,
    source: question.source,
    tags: question.tags?.join(', ') || '',
    attachments: question.attachments || []
  });

  // §12.A — Upload state
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    checkQuestionTraceabilityAction(question._id)
      .then(res => { if (res.success && res.data !== undefined) setHasBeenAnswered(res.data); })
      .catch(console.error);
  }, [question._id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const parsedTags = form.tags.split(',').map(s => s.trim()).filter(Boolean);
      const res = await saveQuestionAction(question._id, {
        questionText: form.questionText,
        options: form.options,
        correctOptionIndex: form.correctOptionIndex,
        explanation: form.explanation,
        difficulty: form.difficulty,
        module: form.module,
        source: form.source,
        tags: parsedTags,
        attachments: form.attachments
      });
      if (res.success) {
        toast.success(t('saveSuccess'));
        onSuccess();
      } else {
        toast.error(t('saveError') + ': ' + res.error);
      }
    } catch (err: unknown) {
      toast.error(t('saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-sm" role="dialog" aria-modal="true">
      <form onSubmit={handleSubmit} className="w-full max-w-xl h-full bg-background border-l border-white/10 p-6 flex flex-col gap-4 overflow-y-auto shadow-2xl relative select-none">
        <header className="flex justify-between items-center border-b border-white/5 pb-4">
          <div>
            <h2 className="text-sm font-bold font-mono tracking-widest uppercase text-primary">{t('btnEdit')}</h2>
            <p className="text-[10px] uppercase font-mono text-muted-foreground mt-1">ID: {question._id.slice(0, 8)}... | {t('versionLabel', { version: question.version })}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={t('btnCancel')} className="text-muted-foreground hover:text-foreground transition-colors"><X className="w-5 h-5" aria-hidden="true" /></button>
        </header>

        {/* Alerta de Trazabilidad */}
        {hasBeenAnswered === null ? (
          <div className="h-10 bg-white/5 animate-pulse" />
        ) : (
          <div className={`p-4 border font-mono text-[9px] uppercase tracking-wider flex gap-3 ${hasBeenAnswered ? 'bg-yellow-500/5 border-yellow-500/25 text-yellow-400' : 'bg-green-500/5 border-green-500/25 text-green-400'}`}>
            {hasBeenAnswered ? <AlertTriangle className="w-4 h-4 shrink-0 text-yellow-500" aria-hidden="true" /> : <CheckCircle className="w-4 h-4 shrink-0 text-green-500" aria-hidden="true" />}
            <div className="space-y-1">
              <strong className="font-bold flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" /> {t(hasBeenAnswered ? 'traceCopyOnWriteTitle' : 'traceInplaceTitle')}</strong>
              <p className="leading-relaxed text-muted-foreground">{t(hasBeenAnswered ? 'traceCopyOnWriteDesc' : 'traceInplaceDesc', { version: question.version + 1 })}</p>
            </div>
          </div>
        )}

        {/* Campos de Formulario */}
        <div className="space-y-4 flex-1">
          <LabeledField id={`${formId}-text`} label={t('labelQuestionText')} required labelClassName="text-[8px] uppercase tracking-[0.3em] text-muted-foreground/60 font-bold"><textarea className="w-full bg-white/5 border border-white/10 p-2 text-[10px] font-mono outline-none focus:border-primary/50 min-h-[60px]" required value={form.questionText} onChange={e => setForm({ ...form, questionText: e.target.value })} /></LabeledField>
          <div className="grid grid-cols-2 gap-4">
            <LabeledField id={`${formId}-module`} label={t('labelModule')} required labelClassName="text-[8px] uppercase tracking-[0.3em] text-muted-foreground/60 font-bold"><input type="text" className="w-full bg-white/5 border border-white/10 p-2 text-[10px] font-mono outline-none focus:border-primary/50" required value={form.module} onChange={e => setForm({ ...form, module: e.target.value })} /></LabeledField>
            <LabeledField id={`${formId}-source`} label={t('labelSource')} required labelClassName="text-[8px] uppercase tracking-[0.3em] text-muted-foreground/60 font-bold"><input type="text" className="w-full bg-white/5 border border-white/10 p-2 text-[10px] font-mono outline-none focus:border-primary/50" required value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} /></LabeledField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <LabeledField id={`${formId}-difficulty`} label={t('labelDifficulty')} labelClassName="text-[8px] uppercase tracking-[0.3em] text-muted-foreground/60 font-bold"><select className="w-full bg-white/5 border border-white/10 p-2 text-[10px] font-mono uppercase outline-none focus:border-primary/50" value={form.difficulty} onChange={e => setForm({ ...form, difficulty: e.target.value as 'easy' | 'medium' | 'hard' })}><option value="easy">{t('diffEasy')}</option><option value="medium">{t('diffMedium')}</option><option value="hard">{t('diffHard')}</option></select></LabeledField>
            <LabeledField id={`${formId}-correct`} label={t('labelCorrectOption')} labelClassName="text-[8px] uppercase tracking-[0.3em] text-muted-foreground/60 font-bold"><select className="w-full bg-white/5 border border-white/10 p-2 text-[10px] font-mono uppercase outline-none focus:border-primary/50" value={form.correctOptionIndex} onChange={e => setForm({ ...form, correctOptionIndex: Number(e.target.value) })}>{form.options.map((_, i) => <option key={i} value={i}>{t('optionLetter')}{String.fromCharCode(65 + i)} ({i})</option>)}</select></LabeledField>
          </div>

          {/* Opciones */}
          <div className="space-y-2">
            <div className="flex justify-between items-center"><label className="text-[8px] uppercase tracking-[0.3em] text-muted-foreground/60 font-bold">{t('labelOptions')}</label>{form.options.length < 6 && <button type="button" onClick={() => setForm({ ...form, options: [...form.options, ''] })} aria-label={t('btnAddOption')} className="text-[8px] uppercase tracking-widest text-primary font-bold hover:underline">+{t('btnAddOption')}</button>}</div>
            <div className="space-y-2">
              {form.options.map((opt, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <span className="text-[9px] font-mono text-muted-foreground uppercase">{String.fromCharCode(65 + i)})</span>
                  <input type="text" className="flex-1 bg-white/5 border border-white/10 p-2 text-[10px] font-mono outline-none focus:border-primary/50" required value={opt} onChange={e => { const copy = [...form.options]; copy[i] = e.target.value; setForm({ ...form, options: copy }); }} />
                  {form.options.length > 2 && <button type="button" onClick={() => { const copy = form.options.filter((_, idx) => idx !== i); const newIdx = form.correctOptionIndex >= copy.length ? 0 : form.correctOptionIndex; setForm({ ...form, options: copy, correctOptionIndex: newIdx }); }} aria-label={`${t('btnDeleteOption')} ${String.fromCharCode(65 + i)}`} className="text-[8px] font-mono text-red-400 hover:text-red-300 uppercase shrink-0">{t('btnDeleteOption')}</button>}
                </div>
              ))}
            </div>
          </div>

          <LabeledField id={`${formId}-explanation`} label={t('labelExplanation')} labelClassName="text-[8px] uppercase tracking-[0.3em] text-muted-foreground/60 font-bold"><textarea className="w-full bg-white/5 border border-white/10 p-2 text-[10px] font-mono outline-none focus:border-primary/50 min-h-[50px]" value={form.explanation} onChange={e => setForm({ ...form, explanation: e.target.value })} /></LabeledField>
          <LabeledField id={`${formId}-tags`} label={t('labelTags')} labelClassName="text-[8px] uppercase tracking-[0.3em] text-muted-foreground/60 font-bold"><input type="text" className="w-full bg-white/5 border border-white/10 p-2 text-[10px] font-mono outline-none focus:border-primary/50" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} /></LabeledField>

          {/* §12.A — Attachments */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[8px] uppercase tracking-[0.3em] text-muted-foreground/60 font-bold flex items-center gap-2">
                <Paperclip className="w-3 h-3" aria-hidden="true" /> {t('attachmentsLabel')}
              </label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                aria-label={t('btnUpload')}
                className="text-[8px] uppercase tracking-widest text-primary font-bold hover:underline flex items-center gap-1"
              >
                {isUploading ? <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" /> : <Upload className="w-3 h-3" aria-hidden="true" />}
                {t('btnUploadAction')}
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml,application/pdf,audio/mpeg,audio/wav,audio/ogg,video/mp4,video/webm,text/plain"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setIsUploading(true);
                try {
                  const fd = new FormData();
                  fd.append('file', file);
                  const res = await fetch('/api/upload', { method: 'POST', body: fd });
                  const data = await res.json();
                  if (data.success) {
                    setForm({ ...form, attachments: [...form.attachments, { url: data.url, name: data.name, type: data.type, size: data.size }] });
                    toast.success(t('uploadSuccess') + data.name);
                  } else {
                    toast.error(t('uploadError') + (data.error || 'desconocido'));
                  }
                } catch {
                  toast.error(t('uploadConnectionError'));
                } finally {
                  setIsUploading(false);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }
              }}
            />

            {form.attachments.length === 0 ? (
              <p className="text-[9px] font-mono text-muted-foreground/50 italic">
                {t('noAttachments')}
              </p>
            ) : (
              <div className="space-y-1.5">
                {form.attachments.map((att, i) => (
                  <div key={i} className="flex items-center gap-2 bg-white/5 border border-white/10 p-2 group">
                    <span className="text-[8px] font-mono uppercase text-muted-foreground w-6">{i + 1}.</span>
                    <span className="flex-1 text-[10px] font-mono truncate" title={att.name}>{att.name}</span>
                    <span className="text-[7px] font-mono text-muted-foreground/60 uppercase">{(att.size / 1024).toFixed(0)}{t('fileSizeKB')}</span>
                    <a href={att.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors" aria-label={t('openFile') + att.name}>
                      <ExternalLink className="w-3 h-3" aria-hidden="true" />
                    </a>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, attachments: form.attachments.filter((_, idx) => idx !== i) })}
                      title={`${t('deleteFile')}${att.name}`}
                      className="text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                      aria-label={`${t('deleteFile')}${att.name}`}
                    >
                      <Trash2 className="w-3 h-3" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <footer className="border-t border-white/5 pt-4 flex gap-4 mt-auto">
          <button type="button" onClick={onClose} aria-label={t('btnCancel')} className="flex-1 py-3 text-[10px] uppercase font-mono tracking-widest text-muted-foreground border border-white/10 hover:border-white/20 transition-all">{t('btnCancel')}</button>
          <button type="submit" disabled={isSaving} aria-label={t('btnSave')} className="flex-1 py-3 text-[10px] uppercase font-mono tracking-widest bg-primary text-primary-foreground font-black disabled:opacity-50 transition-all">{isSaving ? t('btnSaving') : t('btnSave')}</button>
        </footer>
      </form>
    </div>
  );
}
