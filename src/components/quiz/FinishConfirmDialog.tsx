'use client';

/**
 * @purpose Renderiza una notificacion para confirmar el final de un quiz.
 * @purpose_en Renders a dialog for confirming the completion of a quiz.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:2,sig:1g8ao7e
 * @lastUpdated 2026-06-23T19:49:36.559Z
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface FinishConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  translations: {
    finishTitle: string;
    finishDescription: string;
    cancelAction: string;
    confirmFinish: string;
  };
}

export function FinishConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  translations,
}: FinishConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card/95 backdrop-blur-2xl border-border rounded-none shadow-2xl max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold tracking-tight uppercase italic text-foreground">
            {translations.finishTitle}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground mt-4 leading-relaxed antialiased">
            {translations.finishDescription}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-4 mt-8">
          <Button
            variant="outline"
            className="rounded-none font-mono text-[10px] tracking-widest uppercase flex-1 h-12 text-foreground"
            onClick={() => onOpenChange(false)}
          >
            {translations.cancelAction}
          </Button>
          <Button
            className="rounded-none font-mono text-[10px] tracking-widest uppercase flex-1 h-12 bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={onConfirm}
          >
            {translations.confirmFinish}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
