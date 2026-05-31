'use client';

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
