'use client';

interface ProgressBarProps {
  current: number;
  total: number;
  className?: string;
}

/**
 * Progress bar with dynamic width. Uses inline style for the width
 * since Tailwind cannot express arbitrary dynamic percentages.
 * This is the recommended pattern in Tailwind docs for progress bars.
 */
export function ProgressBar({ current, total, className = 'h-1.5 bg-muted' }: ProgressBarProps) {
  const pct = total > 0 ? (current / total) * 100 : 0;
  return (
    <div className={className}>
      <div
        className="h-full bg-warning transition-all duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
