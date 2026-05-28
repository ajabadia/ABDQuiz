'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Search,
  AlertCircle,
  CheckCircle2,
  Clock,
  User,
  FileText,
  Send,
  ChevronRight,
  ChevronDown,
  ArrowLeft,
  Star,
  MessageSquare,
  ShieldCheck,
  GraduationCap,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  getAttemptsForGradingAction,
  getAttemptDetailAction,
  submitManualGradingAction,
  type SerializedGradingAttempt,
  type AttemptDetail,
  type AttemptDetailQuestion,
} from '@/actions/grading';

type FilterTab = 'pending_manual_review' | 'manually_graded' | 'auto_graded' | 'all';

export default function GradingManager() {
  const t = useTranslations('grading');
  const c = useTranslations('common');

  const [attempts, setAttempts] = useState<SerializedGradingAttempt[]>([]);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterTab>('pending_manual_review');

  // Detail view
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AttemptDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Grade form state: { [questionIndex]: { manualPointsAwarded, feedback } }
  const [gradeForm, setGradeForm] = useState<Record<number, { points: string; feedback: string }>>({});
  const [submitting, setSubmitting] = useState(false);

  // Load attempts on mount — no synchronous setState in effect body
  useEffect(() => {
    let cancelled = false;
    getAttemptsForGradingAction(activeFilter)
      .then((data) => {
        if (!cancelled) {
          setAttempts(data);
          setInitialLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          toast.error('Error al cargar los intentos');
          setInitialLoaded(true);
        }
      });
    return () => { cancelled = true; };
  }, [activeFilter]);

  // Cargar detalle al seleccionar intento (event handlers only — no effect)
  const loadDetail = useCallback(async (attemptId: string) => {
    setLoadingDetail(true);
    setSelectedAttemptId(attemptId);
    setGradeForm({});
    try {
      const data = await getAttemptDetailAction(attemptId);
      setDetail(data);
      // Pre-populate form with existing manual grades if any
      if (data) {
        const form: Record<number, { points: string; feedback: string }> = {};
        for (const q of data.questions) {
          form[q.questionIndex] = {
            points: q.manualPointsAwarded !== undefined ? String(q.manualPointsAwarded) : '',
            feedback: q.feedback || '',
          };
        }
        setGradeForm(form);
      }
    } catch {
      toast.error('Error al cargar el detalle del intento');
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const handleBack = () => {
    setSelectedAttemptId(null);
    setDetail(null);
    setGradeForm({});
  };

  const handleSubmitGrades = async () => {
    if (!detail) return;
    setSubmitting(true);
    try {
      const grades = Object.entries(gradeForm)
        .filter(([_, v]) => v.points !== '')
        .map(([idx, v]) => ({
          questionIndex: parseInt(idx),
          manualPointsAwarded: parseInt(v.points) || 0,
          feedback: v.feedback,
        }));

      const result = await submitManualGradingAction(detail._id, grades);
      if (result.success) {
        toast.success('Calificación guardada con éxito');
        // Refresh the list — re-fetch without loading state
        getAttemptsForGradingAction(activeFilter).then(setAttempts);
        loadDetail(detail._id); // Refresh detail
      } else {
        toast.error(result.error || 'Error al guardar la calificación');
      }
    } catch {
      toast.error('Error de comunicación con el servidor');
    } finally {
      setSubmitting(false);
    }
  };

  const loadingList = !initialLoaded;

  const filteredAttempts = attempts.filter((a) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      a.userId.toLowerCase().includes(term) ||
      (a.examConfigId?.name || '').toLowerCase().includes(term)
    );
  });

  const filterTabs: { key: FilterTab; label: string; icon: React.ReactNode }[] = [
    { key: 'pending_manual_review', label: t('tabPending'), icon: <Clock className="w-3.5 h-3.5" /> },
    { key: 'manually_graded', label: t('tabGraded'), icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
    { key: 'auto_graded', label: t('tabAuto'), icon: <Star className="w-3.5 h-3.5" /> },
    { key: 'all', label: c('all'), icon: <FileText className="w-3.5 h-3.5" /> },
  ];

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending_manual_review: 'bg-amber-500/20 border-amber-500/50 text-amber-400',
      manually_graded: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400',
      auto_graded: 'bg-primary/20 border-primary/50 text-primary',
    };
    const labels: Record<string, string> = {
      pending_manual_review: t('statusPending'),
      manually_graded: t('statusGraded'),
      auto_graded: t('statusAuto'),
    };
    return (
      <span className={`px-2.5 py-0.5 border font-semibold inline-block text-[9px] font-mono ${styles[status] || 'bg-muted/20 border-border text-muted-foreground'}`}>
        {labels[status] || status}
      </span>
    );
  };

  // --- Detail / Correction View ---
  if (selectedAttemptId && detail) {
    const threshold = detail.examConfigId?.name ? 70 : 70;
    const isPassed = detail.percentage >= threshold;

    return (
      <div className="flex flex-col gap-6">
        {/* Back button + header */}
        <div className="flex items-center gap-4">
          <Button
            onClick={handleBack}
            variant="outline"
            className="h-8 w-8 rounded-none border-border p-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h2 className="text-sm font-bold uppercase tracking-widest font-mono">
              {t('correctionTitle')}
            </h2>
            <p className="text-[10px] text-muted-foreground font-mono">
              {detail.userId} • {detail.examConfigId?.name || '—'} • {getStatusBadge(detail.gradingStatus)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-mono text-muted-foreground">{t('scoreLabel')}</p>
            <p className={`text-lg font-black ${isPassed ? 'text-primary' : 'text-destructive'}`}>
              {detail.percentage}%
            </p>
          </div>
        </div>

        <Separator className="bg-border" />

        {/* Questions */}
        <div className="flex flex-col gap-4">
          {detail.questions.map((q) => (
            <QuestionCorrectionCard
              key={q.questionIndex}
              question={q}
              points={gradeForm[q.questionIndex]?.points || ''}
              feedback={gradeForm[q.questionIndex]?.feedback || ''}
              onPointsChange={(val) =>
                setGradeForm((prev) => ({
                  ...prev,
                  [q.questionIndex]: { ...prev[q.questionIndex], points: val },
                }))
              }
              onFeedbackChange={(val) =>
                setGradeForm((prev) => ({
                  ...prev,
                  [q.questionIndex]: { ...prev[q.questionIndex], feedback: val },
                }))
              }
            />
          ))}
        </div>

        {/* Submit */}
        <div className="sticky bottom-6 z-10 flex justify-end">
          <Button
            onClick={handleSubmitGrades}
            disabled={submitting || detail.gradingStatus === 'manually_graded'}
            className="h-12 px-8 rounded-none font-mono text-[10px] tracking-widest uppercase bg-primary hover:bg-primary/80"
          >
            <Send className="w-4 h-4 mr-2" />
            {submitting ? t('btnSaving') : detail.gradingStatus === 'manually_graded' ? t('alreadyGraded') : t('btnSubmitGrade')}
          </Button>
        </div>
      </div>
    );
  }

  // --- Inbox View ---
  return (
    <div className="flex flex-col gap-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {filterTabs.map((tab) => (
          <Button
            key={tab.key}
            onClick={() => setActiveFilter(tab.key)}
            variant={activeFilter === tab.key ? 'default' : 'outline'}
            className={`h-8 rounded-none font-mono text-[9px] tracking-wider uppercase ${
              activeFilter === tab.key
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.icon}
            <span className="ml-1.5">{tab.label}</span>
          </Button>
        ))}

        <div className="relative ml-auto max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="pl-9 h-8 bg-card/20 border-white/5 rounded-none font-mono text-[10px]"
          />
        </div>
      </div>

      {/* List */}
      {loadingList ? (
        <Card className="p-12 text-center bg-card/20 border-white/5 rounded-none">
          <p className="text-xs uppercase tracking-widest font-mono text-muted-foreground">
            {t('loadingAttempts')}
          </p>
        </Card>
      ) : filteredAttempts.length === 0 ? (
        <Card className="p-12 text-center bg-card/20 border-white/5 rounded-none flex flex-col items-center justify-center gap-4">
          <AlertCircle className="w-8 h-8 text-muted-foreground" />
          <p className="text-xs uppercase tracking-widest font-mono text-muted-foreground">
            {t('noAttempts')}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filteredAttempts.map((attempt) => {
            const threshold = attempt.examConfigId?.passThreshold ?? 70;
            const isPassed = attempt.percentage >= threshold;

            return (
              <button
                key={attempt._id}
                onClick={() => loadDetail(attempt._id)}
                aria-label={`${t('viewDetail')} ${attempt.userId}`}
                className="w-full text-left p-4 bg-card/20 border border-white/5 hover:border-primary/30 hover:bg-card/40 transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 bg-white/[0.02] border border-border shrink-0">
                      <User className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground font-mono truncate">
                        {attempt.userId}
                      </p>
                      <p className="text-[9px] text-muted-foreground font-mono mt-0.5">
                        {attempt.examConfigId?.name || '—'} • {formatDate(attempt.startedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {getStatusBadge(attempt.gradingStatus)}
                    <span className={`text-xs font-black font-mono ${isPassed ? 'text-primary' : 'text-destructive'}`}>
                      {attempt.percentage}%
                    </span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// --- Question Correction Card (Internal Component) ---

interface QuestionCorrectionCardProps {
  question: AttemptDetailQuestion;
  points: string;
  feedback: string;
  onPointsChange: (val: string) => void;
  onFeedbackChange: (val: string) => void;
}

function QuestionCorrectionCard({
  question,
  points,
  feedback,
  onPointsChange,
  onFeedbackChange,
}: QuestionCorrectionCardProps) {
  const t = useTranslations('grading');
  const [expanded, setExpanded] = useState(true);

  const studentAnswerText = question.selectedOptionIndex !== undefined && question.selectedOptionIndex !== null
    ? question.options[question.selectedOptionIndex] || `[${t('optionIndex')} ${question.selectedOptionIndex}]`
    : `[${t('notAnswered')}]`;

  const correctAnswerText = question.options[question.correctOptionIndex] || `[${t('optionIndex')} ${question.correctOptionIndex}]`;

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
          <span className="text-xs font-mono truncate">
            {question.questionText}
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className={`text-[9px] font-bold font-mono ${question.isCorrect ? 'text-primary' : 'text-destructive'}`}>
            {question.isCorrect ? t('correct') : t('incorrect')}
          </span>
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

          {/* Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 bg-destructive/5 border border-destructive/20">
              <p className="text-[8px] font-mono text-destructive uppercase tracking-wider mb-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {t('studentAnswer')}
              </p>
              <p className="text-[10px] font-mono text-foreground">
                {studentAnswerText}
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
