'use client';

/**
 * @purpose Renderiza una dialogo modal para resolver acusaciones con opciones para aprobado o rechazado, proporcionando retroalimentación y seleccionando modos de resolucion.
 * @purpose_en Renders a modal dialog for resolving allegations with options to approve or reject, providing feedback and selecting resolution modes.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:6,sig:12sagzh
 * @lastUpdated 2026-06-23T19:48:47.203Z
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog';
import { resolveAllegationAction, rejectAllegationAction } from '@/actions/allegations';
import { type SerializedAllegation } from './AllegationsClientTerminal';

interface ResolveAllegationModalProps {
  allegation: SerializedAllegation | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  translations: Record<string, string>;
}

export function ResolveAllegationModal({ 
  allegation, 
  isOpen, 
  onClose, 
  onSuccess, 
  translations 
}: ResolveAllegationModalProps) {
  const [resolutionMode, setResolutionMode] = useState<'CORRECTION_SHIFT' | 'CANCEL_QUESTION' | 'GIVE_POINTS_TO_ALL'>('CORRECTION_SHIFT');
  const [feedback, setFeedback] = useState('');
  const [nextIndex, setNextIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!allegation) return null;

  const handleSubmit = async (approve: boolean) => {
    if (!feedback.trim()) return;
    setLoading(true);
    setError('');

    try {
      const res = approve 
        ? await resolveAllegationAction({
            allegationId: allegation._id,
            resolutionMode,
            feedback: feedback.trim(),
            nextCorrectOptionIndex: resolutionMode === 'CORRECTION_SHIFT' ? nextIndex : undefined
          })
        : await rejectAllegationAction({
            allegationId: allegation._id,
            feedback: feedback.trim()
          });

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.error || translations.toastResolveError);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : translations.toastResolveError;
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const options: { key: 'CORRECTION_SHIFT' | 'CANCEL_QUESTION' | 'GIVE_POINTS_TO_ALL'; title: string; desc: string }[] = [
    { key: 'CORRECTION_SHIFT', title: translations.optionShift, desc: translations.optionShiftDesc },
    { key: 'CANCEL_QUESTION', title: translations.optionCancel, desc: translations.optionCancelDesc },
    { key: 'GIVE_POINTS_TO_ALL', title: translations.optionGivePoints, desc: translations.optionGivePointsDesc }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-card/95 backdrop-blur-2xl border-white/10 rounded-none shadow-2xl overflow-y-auto max-h-[90vh]">
        <DialogHeader className="space-y-4">
          <DialogTitle className="text-xl font-black uppercase italic text-foreground tracking-tight">
            {translations.modalTitle}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground uppercase font-mono tracking-wider">
            {translations.modalDesc}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-6">
          <div className="p-4 bg-white/[0.02] border border-white/5 space-y-2">
            <span className="font-mono text-[9px] text-primary uppercase tracking-widest">{translations.tableQuestion}</span>
            <p className="text-sm font-semibold">{allegation.questionText}</p>
            <div className="pt-2 border-t border-white/5">
              <span className="font-mono text-[9px] text-destructive/80 uppercase tracking-widest">{translations.tableReason}</span>
              <p className="text-xs text-muted-foreground italic leading-relaxed">&quot;{allegation.reason}&quot;</p>
            </div>
          </div>

          <div className="space-y-4">
            <span className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest">{translations.resolutionStrategy}</span>
            <div className="grid grid-cols-1 gap-2">
              {options.map((opt) => (
                <label 
                  key={opt.key} 
                  className={`p-4 border cursor-pointer transition-all flex flex-col gap-1 ${
                    resolutionMode === opt.key 
                      ? 'border-primary bg-primary/5' 
                      : 'border-white/5 bg-white/[0.01] hover:border-white/10'
                  }`}
                >
                  <input 
                    type="radio" 
                    name="resolutionMode" 
                    value={opt.key}
                    checked={resolutionMode === opt.key}
                    onChange={() => setResolutionMode(opt.key)}
                    className="sr-only"
                  />
                  <span className="text-xs font-bold uppercase">{opt.title}</span>
                  <span className="text-[10px] text-muted-foreground uppercase">{opt.desc}</span>
                </label>
              ))}
            </div>
          </div>

          {resolutionMode === 'CORRECTION_SHIFT' && (
            <div className="space-y-2">
              <label className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest">{translations.newCorrectIndex}</label>
              <input 
                type="number" 
                min={0} 
                max={3}
                value={nextIndex}
                onChange={(e) => setNextIndex(Number(e.target.value))}
                className="w-full p-2.5 bg-black/40 border border-white/10 text-sm focus:outline-none focus:border-primary font-mono text-center"
              />
            </div>
          )}

          <div className="space-y-2">
            <label className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest">{translations.labelFeedback}</label>
            <textarea
              className="w-full h-20 p-3 bg-black/40 border border-white/10 text-sm focus:outline-none focus:border-primary font-mono"
              placeholder={translations.feedbackPlaceholder}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              disabled={loading}
            />
          </div>

          {error && <p className="text-xs text-destructive font-mono">{error}</p>}

          <div className="flex justify-end gap-2 pt-4 border-t border-white/5">
            <Button 
              variant="outline"
              className="rounded-none font-mono text-[9px] tracking-widest uppercase h-10 border-destructive/20 text-destructive/80 hover:bg-destructive/10"
              onClick={() => handleSubmit(false)}
              disabled={loading || !feedback.trim()}
            >
              {translations.btnReject}
            </Button>
            <Button 
              className="rounded-none font-mono text-[9px] tracking-widest uppercase h-10 px-6"
              onClick={() => handleSubmit(true)}
              disabled={loading || !feedback.trim()}
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : translations.btnSubmitResolution}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
