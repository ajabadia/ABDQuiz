'use client';

/**
 * @purpose Renderiza una notificacion emergente que solicita al usuario finalizar un examen o revisar preguntas omitidas.
 * @purpose_en Renders a dialog prompting the user to either finalize an exam or review omitted questions.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:2,sig:1r3xwpd
 * @lastUpdated 2026-06-23T19:49:39.486Z
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

interface OmittedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFinalize: () => void;
  onReview: () => void;
}

export function OmittedDialog({
  open,
  onOpenChange,
  onFinalize,
  onReview,
}: OmittedDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card/95 backdrop-blur-2xl border-border rounded-none shadow-2xl max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold tracking-tight uppercase italic text-foreground">
            Preguntas Omitidas
          </DialogTitle>
          <DialogDescription className="text-muted-foreground mt-4 leading-relaxed antialiased">
            Has alcanzado el final del examen, pero aún tienes preguntas sin contestar. ¿Qué deseas hacer?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-4 mt-8">
          <Button
            variant="outline"
            className="rounded-none font-mono text-[10px] tracking-widest uppercase flex-1 h-12 border-red-900/30 text-red-400 bg-red-950/10 hover:bg-red-900/20"
            onClick={onFinalize}
          >
            Finalizar Examen
          </Button>
          <Button
            className="rounded-none font-mono text-[10px] tracking-widest uppercase flex-1 h-12 bg-primary hover:bg-primary/90 text-black font-bold"
            onClick={onReview}
          >
            Revisar Omitidas
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
