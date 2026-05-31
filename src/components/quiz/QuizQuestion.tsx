'use client';

import { Badge } from '@/components/ui/badge';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Paperclip, FileText, Image, FileAudio, FileVideo, ExternalLink, Sparkles, Loader2 } from 'lucide-react';

interface Attachment {
  url: string;
  name: string;
  type: string;
  size: number;
}

interface QuestionSnapshot {
  questionText: string;
  options: string[];
  correctOptionIndex: number;
  module: string;
  source: string;
  type?: 'multiple_choice' | 'open_text';
  /** §12.A — Adjuntos */
  attachments?: Attachment[];
}

interface QuizQuestionProps {
  qs: QuestionSnapshot;
  selectedOption: number | null;
  onSelect: (idx: number) => void;
  textAnswer?: string;
  onTextChange?: (text: string) => void;
  showFeedback: boolean;
  isSubmitting: boolean;
  aiFeedback?: string;
  aiFeedbackLoading?: boolean;
}

export default function QuizQuestion({
  qs,
  selectedOption,
  onSelect,
  textAnswer = '',
  onTextChange,
  showFeedback,
  isSubmitting,
  aiFeedback,
  aiFeedbackLoading = false
}: QuizQuestionProps) {
  const t = useTranslations('quiz');
  const isOpenText = qs.type === 'open_text';
  // Refresh comment to trigger Turbopack re-sync of translation bundles

  /** §12.A — Render attachment icon based on MIME type */
  const AttachmentIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="w-4 h-4" />;
    if (type.startsWith('audio/')) return <FileAudio className="w-4 h-4" />;
    if (type.startsWith('video/')) return <FileVideo className="w-4 h-4" />;
    if (type === 'application/pdf') return <FileText className="w-4 h-4" />;
    return <Paperclip className="w-4 h-4" />;
  };

  return (
    <div className="flex flex-col gap-10 max-w-4xl mx-auto w-full py-10 px-4">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
           <Badge variant="outline" className="rounded-none border-white/10 bg-white/5 text-muted-foreground font-mono text-[9px] uppercase tracking-tighter px-2 py-0.5">
            {t('module')}: {qs.module}
          </Badge>
          <Badge variant="outline" className="rounded-none border-white/10 bg-white/5 text-muted-foreground font-mono text-[9px] uppercase tracking-tighter px-2 py-0.5">
            {t('source')}: {qs.source}
          </Badge>
          {isOpenText && (
            <Badge variant="outline" className="rounded-none border-amber-500/30 bg-amber-500/10 text-amber-400 font-mono text-[9px] uppercase tracking-tighter px-2 py-0.5">
              {t('openTextBadge') || 'DESARROLLO'}
            </Badge>
          )}
        </div>
        
        <h1 className="text-3xl md:text-4xl font-bold leading-tight tracking-tight text-foreground antialiased">
          {qs.questionText}
        </h1>

        {/* §12.A — Attachments display */}
        {qs.attachments && qs.attachments.length > 0 && (
          <div className="flex flex-wrap gap-3 mt-4">
            {qs.attachments.map((att, i) => (
              <a
                key={i}
                href={att.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-2.5 border border-white/10 bg-card/50 px-4 py-2.5 transition-all hover:border-primary/30 hover:bg-primary/5 min-w-0"
                aria-label={`Abrir adjunto: ${att.name}`}
              >
                {AttachmentIcon(att.type)}
                <span className="text-[10px] font-mono truncate max-w-[180px] text-muted-foreground group-hover:text-foreground transition-colors">
                  {att.name}
                </span>
                <span className="text-[8px] font-mono text-muted-foreground/50 uppercase shrink-0">
                  {(att.size / 1024).toFixed(0)}KB
                </span>
                <ExternalLink className="w-3 h-3 text-muted-foreground/50 group-hover:text-primary transition-colors shrink-0" />
              </a>
            ))}
          </div>
        )}
      </div>

      {isOpenText ? (
        /* ── Open Text: textarea ── */
        <div className="flex flex-col gap-3 w-full" role="group" aria-label="Respuesta de desarrollo">
          <label className="text-[9px] uppercase tracking-[0.2em] font-mono text-muted-foreground font-bold">
            {t('yourAnswer') || 'Tu respuesta'}
          </label>
          <textarea
            value={textAnswer}
            onChange={(e) => onTextChange?.(e.target.value)}
            disabled={isSubmitting || showFeedback}
            placeholder={t('openTextPlaceholder') || 'Escribe tu respuesta aquí...'}
            rows={8}
            className={cn(
              "w-full bg-card border p-5 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/40",
              "outline-none resize-y transition-all duration-150",
              "border-white/10 hover:border-white/20 focus:border-primary/50",
              (isSubmitting || showFeedback) && "cursor-default opacity-70"
            )}
          />
          {textAnswer.length > 0 && (
            <p className="text-[10px] font-mono text-muted-foreground text-right">
              {textAnswer.length} {t('characters') || 'caracteres'}
            </p>
          )}
        </div>
      ) : (
        /* ── Multiple Choice: options ── */
        <div className="grid grid-cols-1 gap-4 w-full" role="group" aria-label="Options">
          {qs.options.map((option: string, idx: number) => (
            <button aria-label={`${String.fromCharCode(65 + idx)}: ${option}`}
              key={idx}
              disabled={isSubmitting || showFeedback}
              onClick={() => onSelect(idx)}
              className={cn(
                "group flex items-start gap-5 border p-5 text-left transition-all duration-150 outline-none rounded-none",
                "bg-card text-foreground border-white/10 hover:border-white/20",
                selectedOption === idx && "border-primary bg-primary/5 shadow-[0_0_15px_rgba(0,240,255,0.05)]",
                showFeedback && idx === qs.correctOptionIndex && "border-green-500/50 bg-green-500/10",
                showFeedback && selectedOption === idx && idx !== qs.correctOptionIndex && "border-destructive/50 bg-destructive/10",
                (isSubmitting || showFeedback) && "cursor-default"
              )}
            >
              <span className={cn(
                "flex-shrink-0 w-8 h-8 flex items-center justify-center font-mono text-xs border transition-colors",
                selectedOption === idx ? "border-primary text-primary bg-primary/10" : "border-white/10 text-muted-foreground group-hover:border-white/20",
                showFeedback && idx === qs.correctOptionIndex && "border-green-500 text-green-500 bg-green-500/10",
                showFeedback && selectedOption === idx && idx !== qs.correctOptionIndex && "border-destructive text-destructive bg-destructive/10"
              )}>
                {String.fromCharCode(65 + idx)}
              </span>
              <span className="pt-1 text-sm md:text-base leading-relaxed">{option}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── AI Tutor Feedback Panel ── */}
      {showFeedback && (
        <div className="w-full border border-primary/20 bg-primary/[0.02] p-6 md:p-8 space-y-4" role="region" aria-label="Feedback de IA">
          <div className="flex items-center gap-3">
            <Sparkles className="w-4 h-4 text-primary" aria-hidden="true" />
            <h3 className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary font-bold">
              {t('aiFeedback') || 'TUTOR IA'}
            </h3>
          </div>

          {aiFeedbackLoading ? (
            <div className="flex items-center gap-3 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              <span className="text-sm font-mono italic">
                {t('aiFeedbackGenerating') || 'Generando feedback personalizado...'}
              </span>
            </div>
          ) : aiFeedback ? (
            <div className="text-sm md:text-base leading-relaxed text-foreground/90 whitespace-pre-line antialiased">
              {aiFeedback}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground italic font-mono">
              {t('aiFeedbackError') || 'No se pudo generar el feedback automático.'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
