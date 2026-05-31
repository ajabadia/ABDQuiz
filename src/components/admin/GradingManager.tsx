'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Search, AlertCircle, ChevronRight, ArrowLeft, User, Clock, CheckCircle2, Star, FileText } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { getAttemptsForGradingAction, getAttemptDetailAction, submitManualGradingAction } from '@/actions/grading';
import { QuestionCorrectionCard } from './QuestionCorrectionCard';
import { ChatThread } from '@/components/chat/ChatThread';
import { type FilterTab, getFilterTabs, formatDate, getStatusBadge } from './gradingConstants';

const TAB_ICONS: Record<string, React.ReactNode> = {
  Clock: <Clock className="w-3.5 h-3.5" />,
  CheckCircle2: <CheckCircle2 className="w-3.5 h-3.5" />,
  Star: <Star className="w-3.5 h-3.5" />,
};
const DEFAULT_TAB_ICON = <FileText className="w-3.5 h-3.5" />;

function CorrectionView({
  detail,
  gradeForm,
  submitting,
  onBack,
  onGradeChange,
  onSubmit,
}: {
  detail: any;
  gradeForm: Record<number, { points: string; feedback: string }>;
  submitting: boolean;
  onBack: () => void;
  onGradeChange: (idx: number, field: 'points' | 'feedback', val: string) => void;
  onSubmit: () => void;
}) {
  const t = useTranslations('grading');
  const threshold = detail.examConfigId?.name ? 70 : 70;
  const isPassed = detail.percentage >= threshold;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button onClick={onBack} variant="outline" className="h-8 w-8 rounded-none border-border p-0"><ArrowLeft className="w-4 h-4" /></Button>
        <div className="flex-1">
          <h2 className="text-sm font-bold uppercase tracking-widest font-mono">{t('correctionTitle')}</h2>
          <p className="text-[10px] text-muted-foreground font-mono">{detail.userId} • {detail.examConfigId?.name || '—'} • {getStatusBadge(detail.gradingStatus, t)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-mono text-muted-foreground">{t('scoreLabel')}</p>
          <p className={`text-lg font-black ${isPassed ? 'text-primary' : 'text-destructive'}`}>{detail.percentage}%</p>
        </div>
      </div>
      <Separator className="bg-border" />
      <div className="flex flex-col gap-4">
        {detail.questions.map((q: any) => (
          <QuestionCorrectionCard
            key={q.questionIndex}
            question={q}
            points={gradeForm[q.questionIndex]?.points || ''}
            feedback={gradeForm[q.questionIndex]?.feedback || ''}
            onPointsChange={(val: string) => onGradeChange(q.questionIndex, 'points', val)}
            onFeedbackChange={(val: string) => onGradeChange(q.questionIndex, 'feedback', val)}
          />
        ))}
      </div>

      {/* Chat Alumno-Profesor */}
      <div className="max-w-2xl mx-auto w-full">
        <ChatThread attemptId={detail._id} isProfessor />
      </div>

      <div className="sticky bottom-6 z-10 flex justify-end">
        <Button onClick={onSubmit} disabled={submitting || detail.gradingStatus === 'manually_graded'} className="h-12 px-8 rounded-none font-mono text-[10px] tracking-widest uppercase bg-primary hover:bg-primary/80">
          {submitting ? t('btnSaving') : detail.gradingStatus === 'manually_graded' ? t('alreadyGraded') : t('btnSubmitGrade')}
        </Button>
      </div>
    </div>
  );
}

export default function GradingManager() {
  const t = useTranslations('grading');
  const c = useTranslations('common');
  const [attempts, setAttempts] = useState<any[]>([]);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterTab>('pending_manual_review');
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [gradeForm, setGradeForm] = useState<Record<number, { points: string; feedback: string }>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getAttemptsForGradingAction(activeFilter).then(d => { if (!cancelled) { setAttempts(d); setInitialLoaded(true); } }).catch(() => { if (!cancelled) { toast.error('Error loading attempts'); setInitialLoaded(true); } });
    return () => { cancelled = true; };
  }, [activeFilter]);

  const loadDetail = useCallback(async (attemptId: string) => {
    setLoadingDetail(true); setSelectedAttemptId(attemptId); setGradeForm({});
    try {
      const data = await getAttemptDetailAction(attemptId); setDetail(data);
      if (data) {
        const form: Record<number, { points: string; feedback: string }> = {};
        data.questions.forEach((q: any) => { form[q.questionIndex] = { points: q.manualPointsAwarded !== undefined ? String(q.manualPointsAwarded) : '', feedback: q.feedback || '' }; });
        setGradeForm(form);
      }
    } catch { toast.error('Error loading detail'); } finally { setLoadingDetail(false); }
  }, []);

  const handleGradeChange = (idx: number, field: 'points' | 'feedback', val: string) => {
    setGradeForm(prev => ({ ...prev, [idx]: { ...prev[idx], [field]: val } }));
  };

  const handleSubmitGrades = async () => {
    if (!detail) return; setSubmitting(true);
    try {
      const grades = Object.entries(gradeForm).filter(([_, v]) => v.points !== '').map(([idx, v]) => ({ questionIndex: parseInt(idx), manualPointsAwarded: parseInt(v.points) || 0, feedback: v.feedback }));
      const result = await submitManualGradingAction(detail._id, grades);
      if (result.success) { toast.success('Grade saved'); getAttemptsForGradingAction(activeFilter).then(setAttempts); loadDetail(detail._id); }
      else toast.error(result.error || 'Error saving');
    } catch { toast.error('Communication error'); } finally { setSubmitting(false); }
  };

  if (selectedAttemptId && detail) {
    return <CorrectionView detail={detail} gradeForm={gradeForm} submitting={submitting} onBack={() => { setSelectedAttemptId(null); setDetail(null); setGradeForm({}); }} onGradeChange={handleGradeChange} onSubmit={handleSubmitGrades} />;
  }

  const filterTabs = getFilterTabs(t, c);
  const filteredAttempts = attempts.filter(a => !search || a.userId.toLowerCase().includes(search.toLowerCase()) || (a.examConfigId?.name || '').toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        {filterTabs.map(tab => (
          <Button key={tab.key} onClick={() => setActiveFilter(tab.key)} variant={activeFilter === tab.key ? 'default' : 'outline'} className={`h-8 rounded-none font-mono text-[9px] tracking-wider uppercase ${activeFilter === tab.key ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}>
            {TAB_ICONS[tab.iconName] ?? DEFAULT_TAB_ICON}
            <span className="ml-1.5">{tab.label}</span>
          </Button>
        ))}
        <div className="relative ml-auto max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('searchPlaceholder')} className="pl-9 h-8 bg-card/20 border-white/5 rounded-none font-mono text-[10px]" />
        </div>
      </div>

      {!initialLoaded ? (
        <Card className="p-12 text-center bg-card/20 border-white/5 rounded-none">
          <p className="text-xs uppercase tracking-widest font-mono text-muted-foreground">{t('loadingAttempts')}</p>
        </Card>
      ) : filteredAttempts.length === 0 ? (
        <Card className="p-12 text-center bg-card/20 border-white/5 rounded-none flex flex-col items-center gap-4">
          <AlertCircle className="w-8 h-8 text-muted-foreground" />
          <p className="text-xs uppercase tracking-widest font-mono text-muted-foreground">{t('noAttempts')}</p>
        </Card>            ) : (
        <div className="grid grid-cols-1 gap-3">
          {filteredAttempts.map(attempt => {
            const threshold = attempt.examConfigId?.passThreshold ?? 70;
            const isPassed = attempt.percentage >= threshold;
            const hasOpenPreview = attempt.openTextPreview?.length > 0;
            return (
              <button key={attempt._id} onClick={() => loadDetail(attempt._id)} className="w-full text-left p-4 bg-card/20 border border-white/5 hover:border-primary/30 hover:bg-card/40 transition-all duration-200 cursor-pointer">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 bg-white/[0.02] border border-border shrink-0"><User className="w-4 h-4 text-muted-foreground" /></div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground font-mono truncate">{attempt.userId}</p>
                      <p className="text-[9px] text-muted-foreground font-mono mt-0.5">{attempt.examConfigId?.name || '—'} • {formatDate(attempt.startedAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {(() => { const badge = getStatusBadge(attempt.gradingStatus, t); return <span className={`px-2.5 py-0.5 border font-semibold inline-block text-[9px] font-mono ${badge.className}`}>{badge.label}</span>; })()}
                    <span className={`text-xs font-black font-mono ${isPassed ? 'text-primary' : 'text-destructive'}`}>{attempt.percentage}%</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
                {hasOpenPreview && (
                  <div className="mt-3 pt-3 border-t border-amber-500/10">
                    {attempt.openTextPreview.map((preview: { questionText: string; answerSnippet: string }, i: number) => (
                      <div key={i} className="flex items-start gap-2 py-1.5 first:pt-0 last:pb-0">
                        <FileText className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-[8px] font-mono text-amber-400 uppercase tracking-wider truncate">{preview.questionText}</p>
                          <p className="text-[10px] font-mono text-foreground/70 leading-relaxed line-clamp-2">{preview.answerSnippet}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
