'use client';

/**
 * @purpose Renderiza un progreso con una anchura dinámica basada en los valores actuales y totales.
 * @purpose_en Renders a progress bar with dynamic width based on the current and total values.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:0,sig:1uknwzf
 * @lastUpdated 2026-06-23T23:21:46.403Z
 */

interface ProgressBarProps {
  current: number;
  total: number;
  className?: string;
}

/**
 * Progress bar with dynamic width. Uses an injected <style> element
 * to set the width via a CSS class, avoiding inline styles entirely.
 */
export function ProgressBar({ current, total, className = 'h-1.5 bg-muted' }: ProgressBarProps) {
  const pct = total > 0 ? (current / total) * 100 : 0;
  return (
    <div className={className}>
      <style>{`.progress-bar-fill { width: ${pct}%; }`}</style>
      <div className="progress-bar-fill h-full bg-warning transition-all duration-300" />
    </div>
  );
}
