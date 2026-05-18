'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Info, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog';
import { type QuizAttemptQuestion } from '@/types/quiz';
import { Button } from '@/components/ui/button';
import { submitAllegationAction } from '@/actions/allegations';

interface AuditDetailProps {
  questions: QuizAttemptQuestion[];
  attemptId: string;
  translations: {
    auditDetail: string;
    viewExplanation: string;
    explanation: string;
    module: string;
    source: string;
    btnCreateAllegation: string;
    reasonPlaceholder: string;
    btnCancel: string;
    btnSubmit: string;
    toastSuccess: string;
    toastError: string;
  };
}

export function AuditDetail({ questions, attemptId, translations }: AuditDetailProps) {
  const [selectedQuestion, setSelectedQuestion] = useState<QuizAttemptQuestion | null>(null);
  const [isAlleging, setIsAlleging] = useState(false);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [allegationStatus, setAllegationStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleAllegationSubmit = async () => {
    if (!reason.trim() || !selectedQuestion) return;
    setSubmitting(true);
    setAllegationStatus('idle');

    try {
      const res = await submitAllegationAction({
        examAttemptId: attemptId,
        questionId: selectedQuestion.questionId,
        reason: reason.trim()
      });

      if (res.success) {
        setAllegationStatus('success');
        setReason('');
        setTimeout(() => {
          setIsAlleging(false);
          setAllegationStatus('idle');
        }, 3000);
      } else {
        setAllegationStatus('error');
      }
    } catch (err) {
      setAllegationStatus('error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="space-y-4" aria-labelledby="audit-detail-title">
      <h3 id="audit-detail-title" className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-6">
        {translations.auditDetail}
      </h3>
      
      <div className="space-y-2">
        {questions.map((q, idx) => (
          <Card 
            key={idx} 
            className="p-4 bg-card/20 border-border/30 hover:border-border/60 transition-colors rounded-none flex items-center justify-between group cursor-pointer" 
            role="button"
            onClick={() => {
              setSelectedQuestion(q);
              setIsAlleging(false);
              setReason('');
              setAllegationStatus('idle');
            }}
          >
            <div className="flex items-center gap-4">
              <div className="font-mono text-[10px] text-muted-foreground w-6" aria-hidden="true">
                {String(idx + 1).padStart(2, '0')}
              </div>
              <span className="text-sm font-medium line-clamp-1 max-w-[500px]">
                {q.questionSnapshot.questionText}
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              {q.status === 'correcta' ? (
                <CheckCircle2 className="w-4 h-4 text-green-500" aria-label="Correct" />
              ) : (
                <XCircle className="w-4 h-4 text-destructive" aria-label="Incorrect" />
              )}
              <Badge variant="ghost" className="hidden group-hover:flex items-center gap-1.5 font-mono text-[9px] uppercase border border-white/5 bg-white/5">
                <Info className="w-3 h-3" />
                {translations.viewExplanation}
              </Badge>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={!!selectedQuestion} onOpenChange={(open) => !open && setSelectedQuestion(null)}>
        <DialogContent className="max-w-[75vw] w-full bg-card/95 backdrop-blur-2xl border-white/10 rounded-none shadow-2xl overflow-y-auto max-h-[90vh]">
          <DialogHeader className="space-y-6">
            <div className="flex flex-wrap gap-2 pt-2">
              <Badge variant="outline" className="rounded-none border-white/10 bg-white/5 text-[9px] font-mono uppercase text-muted-foreground px-2 py-1">
                {translations.module}: {selectedQuestion?.questionSnapshot.module}
              </Badge>
              <Badge variant="outline" className="rounded-none border-white/10 bg-white/5 text-[9px] font-mono uppercase text-muted-foreground px-2 py-1 max-w-full truncate">
                {translations.source}: {selectedQuestion?.questionSnapshot.source}
              </Badge>
            </div>
            <DialogTitle className="text-xl md:text-3xl font-black leading-[1.1] tracking-tighter uppercase italic text-foreground antialiased">
              {selectedQuestion?.questionSnapshot.questionText}
            </DialogTitle>
          </DialogHeader>
          
          <div className="mt-4 space-y-6">
            <div className="space-y-4">
               <div className="flex items-center gap-4">
                 <div className="h-px flex-1 bg-white/10" />
                 <h4 className="font-mono text-[9px] uppercase tracking-[0.4em] text-primary whitespace-nowrap">
                   {translations.explanation}
                 </h4>
                 <div className="h-px flex-1 bg-white/10" />
               </div>
               <div className="p-8 bg-white/[0.02] border border-white/5 text-sm md:text-lg text-muted-foreground leading-relaxed font-light italic antialiased selection:bg-primary/20 selection:text-primary">
                 {selectedQuestion?.questionSnapshot.explanation || "No documentation available for this task."}
               </div>
            </div>

            {/* Sección de Impugnación de Pregunta */}
            <div className="mt-8 pt-6 border-t border-white/5 space-y-4">
              {!isAlleging ? (
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    className="rounded-none border-destructive/20 text-destructive/80 hover:bg-destructive/10 hover:text-destructive font-mono text-[9px] tracking-widest uppercase h-9"
                    onClick={() => {
                      setIsAlleging(true);
                      setAllegationStatus('idle');
                    }}
                  >
                    <AlertTriangle className="w-3.5 h-3.5 mr-2" />
                    {translations.btnCreateAllegation}
                  </Button>
                </div>
              ) : (
                <div className="p-6 bg-destructive/[0.02] border border-destructive/10 space-y-4">
                  <h5 className="font-mono text-[10px] uppercase tracking-wider text-destructive/80 flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {translations.btnCreateAllegation}
                  </h5>

                  {allegationStatus === 'success' ? (
                    <div className="p-4 bg-green-500/10 border border-green-500/20 text-green-400 font-mono text-xs flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      {translations.toastSuccess}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <textarea
                        className="w-full h-24 p-3 bg-black/40 border border-white/10 rounded-none text-sm text-foreground focus:outline-none focus:border-destructive/40 font-mono"
                        placeholder={translations.reasonPlaceholder}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        disabled={submitting}
                      />

                      {allegationStatus === 'error' && (
                        <p className="text-xs text-destructive font-mono">
                          {translations.toastError}
                        </p>
                      )}

                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          className="rounded-none font-mono text-[9px] tracking-widest uppercase h-9 text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            setIsAlleging(false);
                            setReason('');
                          }}
                          disabled={submitting}
                        >
                          {translations.btnCancel}
                        </Button>
                        <Button
                          className="rounded-none bg-destructive hover:bg-destructive/80 text-destructive-foreground font-mono text-[9px] tracking-widest uppercase h-9"
                          onClick={handleAllegationSubmit}
                          disabled={submitting || !reason.trim()}
                        >
                          {submitting ? (
                            <>
                              <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                              ENVIANDO...
                            </>
                          ) : (
                            translations.btnSubmit
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
