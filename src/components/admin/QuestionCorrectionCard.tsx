'use client';

/**
 * @purpose Renderiza una tarjeta para corregir respuestas del estudiante en un quiz, incluyendo campos de entrada para puntos y retroalimentación.
 * @purpose_en Renders a card for correcting student answers in a quiz, including input fields for points and feedback.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:7,sig:tpqc7i
 * @lastUpdated 2026-06-26T10:02:28.834Z
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  MessageSquare,
  FileText,
  ExternalLink,
} from 'lucide-react';
import type { AttemptDetailQuestion } from '@/actions/gradingTypes';

interface QuestionCorrectionCardProps {
  question: AttemptDetailQuestion;
  points: string;
  feedback: string;
  onPointsChange: (val: string) => void;
  onFeedbackChange: (val: string) => void;
}

export function QuestionCorrectionCard({
  question,
  points,
  feedback,
  onPointsChange,
  onFeedbackChange,
}: QuestionCorrectionCardProps) {
  const t = useTranslations('grading');
  const [expanded, setExpanded] = useState(true);

  const isOpenText = question.type === 'open_text' || question.type === 'development';

  // For open_text: show manualTextAnswer; for multiple_choice: show the selected option text
  const studentAnswerText = isOpenText
    ? question.manualTextAnswer || ''
    : question.selectedOptionIndex !== undefined && question.selectedOptionIndex !== null
      ? question.options[question.selectedOptionIndex] || `[${t('optionIndex')} ${question.selectedOptionIndex}]`
      : '';

  const hasStudentAnswer = isOpenText
    ? studentAnswerText.trim().length > 0
    : question.selectedOptionIndex !== undefined && question.selectedOptionIndex !== null;

  const correctAnswerText = isOpenText
    ? t('openTextNoCorrectAnswer')
    : question.options[question.correctOptionIndex] || `[${t('optionIndex')} ${question.correctOptionIndex}]`;

  return (
    <Card className="bg-card/20 border-border rounded-none overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        aria-label={`${expanded ? t('collapseQuestion') : t('expandQuestion')} ${question.questionIndex + 1}`}
        className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-[9px] font-mono font-bold text-muted-foreground shrink-0">
            #{question.questionIndex + 1}
          </span>
          {isOpenText && (
            <span className="text-[8px] font-mono uppercase tracking-wider px-1.5 py-0.5 border border-amber-500/30 bg-amber-500/10 text-amber-400 shrink-0">
              {t('openTextBadge')}
            </span>
          )}
          <span className="text-xs font-mono truncate">
            {question.questionText}
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {!isOpenText && (
            <span className={`text-[9px] font-bold font-mono ${question.isCorrect ? 'text-primary' : 'text-destructive'}`}>
              {question.isCorrect ? t('correct') : t('incorrect')}
            </span>
          )}
          <span className="text-[9px] font-mono text-muted-foreground">
            {question.timeSpentSeconds}s
          </span>
          {expanded ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 flex flex-col gap-4">
          <Separator className="bg-border" />

          {/* Question text */}
          <div>
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">
              {t('questionLabel')}
            </p>
            <p className="text-xs text-foreground font-mono">
              {question.questionText}
            </p>
          </div>

          {/* Open text / development: show student's written answer */}
          {isOpenText ? (
            <div>
              <div className="p-3 bg-amber-500/5 border border-amber-500/20">
                <p className="text-[8px] font-mono text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  {t('studentAnswer')}
                </p>
                {hasStudentAnswer ? (
                  <p className="text-xs font-mono text-foreground whitespace-pre-wrap leading-relaxed">
                    {studentAnswerText}
                  </p>
                ) : (
                  <p className="text-[10px] font-mono text-muted-foreground italic">
                    {t('notAnswered')}
                  </p>
                )}
              </div>
              {question.attachmentUrl && (
                <div className="mt-2">
                  <a
                    href={question.attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[10px] font-mono text-primary hover:text-primary/80 transition-colors border border-primary/20 px-2.5 py-1.5"
                  >
                    <ExternalLink className="w-3 h-3" />
                    {t('viewAttachment') || 'Ver adjunto'}
                  </a>
                </div>
              )}
            </div>
          ) : (
            /* Multiple choice: show student answer vs correct answer */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 bg-destructive/5 border border-destructive/20">
                <p className="text-[8px] font-mono text-destructive uppercase tracking-wider mb-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {t('studentAnswer')}
                </p>
                <p className="text-[10px] font-mono text-foreground">
                  {hasStudentAnswer ? studentAnswerText : <span className="italic text-muted-foreground">{t('notAnswered')}</span>}
                </p>
              </div>
              <div className="p-3 bg-primary/5 border border-primary/20">
                <p className="text-[8px] font-mono text-primary uppercase tracking-wider mb-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  {t('correctAnswer')}
                </p>
                <p className="text-[10px] font-mono text-foreground">
                  {correctAnswerText}
                </p>
              </div>
            </div>
          )}

          {/* Manual points + feedback */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider mb-1">
                {t('manualPoints')} <span className="text-[8px] opacity-60">({t('maxPoints')}: {question.maxPoints})</span>
              </p>
              <Input
                type="number"
                min={0}
                max={question.maxPoints}
                value={points}
                onChange={(e) => onPointsChange(e.target.value)}
                placeholder="—"
                className="h-8 rounded-none font-mono text-xs bg-card/20 border-border"
              />
            </div>
            <div className="md:col-span-2">
              <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                {t('feedback')}
              </p>
              <textarea
                value={feedback}
                onChange={(e) => onFeedbackChange(e.target.value)}
                placeholder={t('feedbackPlaceholder')}
                rows={2}
                className="w-full bg-card/20 border border-border px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground/50 resize-none outline-none focus:border-primary/50 transition-colors"
              />
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
