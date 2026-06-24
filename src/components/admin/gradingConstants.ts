/**
 * @purpose Gestiona constantes de calificación y funciones útiles para la interfaz administrativa de ABDQuiz.
 * @purpose_en Manages grading constants and utility functions for the admin interface of ABDQuiz.
 * @refactorable false
 * @classification Helper Utility
 * @complexity Low
 * @fingerprint exports:5,imports:0,sig:1yvaojd
 * @lastUpdated 2026-06-23T17:40:47.958Z
 */

export type FilterTab = 'pending_manual_review' | 'manually_graded' | 'auto_graded' | 'all';

export interface FilterTabDef {
  key: FilterTab;
  label: string;
  iconName: string;
}

export function getFilterTabs(t: (key: string) => string, c: (key: string) => string): FilterTabDef[] {
  return [
    { key: 'pending_manual_review', label: t('tabPending'), iconName: 'Clock' },
    { key: 'manually_graded', label: t('tabGraded'), iconName: 'CheckCircle2' },
    { key: 'auto_graded', label: t('tabAuto'), iconName: 'Star' },
    { key: 'all', label: c('all'), iconName: 'FileText' },
  ];
}

export function formatDate(dateStr: string): string {
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
}

export function getStatusBadge(
  status: string,
  t: (key: string) => string,
): { className: string; label: string } {
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
  return {
    className: styles[status] || 'bg-muted/20 border-border text-muted-foreground',
    label: labels[status] || status,
  };
}
