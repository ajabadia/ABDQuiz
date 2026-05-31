'use client';

import { useState, useRef, useEffect, useId } from 'react';
import { ChevronDown } from 'lucide-react';

interface Option {
  _id: string;
  name: string;
  slug?: string;
}

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';

interface FloatingSelectorProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder: string;
  label: string;
  icon?: ReactNode;
  loading?: boolean;
  empty?: boolean;
  emptyMessage?: string;
  loadingMessage?: string;
  disabled?: boolean;
  showSlug?: boolean;
}

export function FloatingSelector({
  value,
  onChange,
  options,
  placeholder,
  label,
  icon,
  loading,
  empty,
  emptyMessage,
  loadingMessage,
  disabled,
  showSlug,
}: FloatingSelectorProps) {
  const t = useTranslations('admin');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const listboxId = useId();
  const labelId = useId();
  const activeIndexRef = useRef(-1);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    if (!open) return;
    activeIndexRef.current = -1;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Keyboard navigation: Escape + arrow keys
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeIndexRef.current = Math.min(activeIndexRef.current + 1, options.length - 1);
        const el = document.getElementById(`${listboxId}-opt-${activeIndexRef.current}`);
        el?.scrollIntoView({ block: 'nearest' });
        el?.focus();
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeIndexRef.current = Math.max(activeIndexRef.current - 1, 0);
        const el = document.getElementById(`${listboxId}-opt-${activeIndexRef.current}`);
        el?.scrollIntoView({ block: 'nearest' });
        el?.focus();
      }
      if (e.key === 'Home') {
        e.preventDefault();
        activeIndexRef.current = 0;
        document.getElementById(`${listboxId}-opt-0`)?.focus();
      }
      if (e.key === 'End') {
        e.preventDefault();
        activeIndexRef.current = options.length - 1;
        document.getElementById(`${listboxId}-opt-${options.length - 1}`)?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, options.length, listboxId]);

  const selectedOption = options.find((o) => o._id === value);
  const displayText = selectedOption
    ? showSlug && selectedOption.slug
      ? `${selectedOption.name} (${selectedOption.slug})`
      : selectedOption.name
    : null;

  if (loading) {
    return (
      <div className="space-y-2">
        <label id={labelId} className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono flex items-center gap-2">
          {label}
        </label>
        <div className="h-12 bg-muted border border-border flex items-center px-4" aria-labelledby={labelId}>
          <span className="text-[10px] font-mono text-muted-foreground uppercase animate-pulse">
            {loadingMessage || t('floatingLoading')}
          </span>
        </div>
      </div>
    );
  }

  if (empty) {
    return (
      <div className="space-y-2">
        <label id={labelId} className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono flex items-center gap-2">
          {icon}
          {label}
        </label>
        <div className="h-12 bg-destructive/5 border border-destructive/20 flex items-center px-4" aria-labelledby={labelId}>
          <span className="text-[10px] font-mono text-destructive uppercase">
            {emptyMessage || t('floatingNoOptions')}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label id={labelId} className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono flex items-center gap-2">
        {label}
      </label>
      <div ref={containerRef} className="relative">
        {/* Chasis de input que actúa como botón del selector */}
        <button
          type="button"
          onClick={() => !disabled && setOpen(!open)}
          disabled={disabled}
          aria-labelledby={labelId}
          aria-label={label}
          className="input-console h-12 uppercase flex items-center justify-between cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listboxId : undefined}
        >
          <span className={displayText ? 'text-foreground' : 'text-muted-foreground'}>
            {displayText || `-- ${placeholder} --`}
          </span>
          <ChevronDown
            className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
              open ? 'rotate-180' : ''
            }`}
            aria-hidden="true"
          />
        </button>

        {/* Dropdown flotante con efecto de cristal oscuro */}
        {open && (
          <div
            id={listboxId}
            role="listbox"
            aria-labelledby={labelId}
            className="absolute top-[52px] left-0 w-full bg-background/95 border border-border rounded-none shadow-2xl z-50 flex flex-col max-h-60 overflow-y-auto"
          >
            {options.map((opt, idx) => (
              <button
                key={opt._id}
                id={`${listboxId}-opt-${idx}`}
                type="button"
                onClick={() => {
                  onChange(opt._id);
                  setOpen(false);
                }}
                aria-label={opt.name}
                aria-posinset={idx + 1}
                aria-setsize={options.length}
                className={`px-4 py-3 text-left text-xs font-mono uppercase border-b border-border/40 hover:bg-primary/5 hover:text-primary transition-colors focus-visible:bg-primary/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 ${
                  opt._id === value
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground'
                }`}
                role="option"
                aria-selected={opt._id === value}
                tabIndex={-1}
              >
                {showSlug && opt.slug ? `${opt.name} (${opt.slug})` : opt.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
