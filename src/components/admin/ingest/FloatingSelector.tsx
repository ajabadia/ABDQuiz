'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface Option {
  _id: string;
  name: string;
  slug?: string;
}

import type { ReactNode } from 'react';

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
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Cerrar con Escape
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const selectedOption = options.find((o) => o._id === value);
  const displayText = selectedOption
    ? showSlug && selectedOption.slug
      ? `${selectedOption.name} (${selectedOption.slug})`
      : selectedOption.name
    : null;

  if (loading) {
    return (
      <div className="space-y-2">
        <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono flex items-center gap-2">
          {label}
        </label>
        <div className="h-12 bg-muted border border-border flex items-center px-4">
          <span className="text-[10px] font-mono text-muted-foreground uppercase animate-pulse">
            {loadingMessage || 'CARGANDO...'}
          </span>
        </div>
      </div>
    );
  }

  if (empty) {
    return (
      <div className="space-y-2">
        <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono flex items-center gap-2">
          {icon}
          {label}
        </label>
        <div className="h-12 bg-destructive/5 border border-destructive/20 flex items-center px-4">
          <span className="text-[10px] font-mono text-destructive uppercase">
            {emptyMessage || 'SIN OPCIONES'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono flex items-center gap-2">
        {label}
      </label>
      <div ref={containerRef} className="relative">
        {/* Chasis de input que actúa como botón del selector */}
        <button
          type="button"
          onClick={() => !disabled && setOpen(!open)}
          disabled={disabled}
          aria-label={label}
          className="input-console h-12 uppercase flex items-center justify-between cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <span className={displayText ? 'text-foreground' : 'text-muted-foreground'}>
            {displayText || `-- ${placeholder} --`}
          </span>
          <ChevronDown
            className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
              open ? 'rotate-180' : ''
            }`}
          />
        </button>

        {/* Dropdown flotante con efecto de cristal oscuro */}
        {open && (
          <div className="absolute top-[52px] left-0 w-full bg-background/95 border border-border rounded-none shadow-2xl z-50 flex flex-col max-h-60 overflow-y-auto">
            {options.map((opt) => (
              <button
                key={opt._id}
                type="button"
                onClick={() => {
                  onChange(opt._id);
                  setOpen(false);
                }}
                aria-label={opt.name}
                className={`px-4 py-3 text-left text-xs font-mono uppercase border-b border-border/40 hover:bg-primary/5 hover:text-primary transition-colors ${
                  opt._id === value
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground'
                }`}
                role="option"
                aria-selected={opt._id === value}
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
