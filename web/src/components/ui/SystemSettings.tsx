'use client';

import { useState, useRef, useEffect } from 'react';
import { Settings, Sun, Moon, Monitor, Languages, Check, X, LogOut } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/routing';
import { cn } from '@/lib/utils';

export function SystemSettings() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const t = useTranslations('settings');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  // Local theme state & synchronization (claro/oscuro/sistema) without external bloat
  const [theme, setThemeState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') || 'dark';
    }
    return 'dark';
  });

  const setTheme = (newTheme: string) => {
    setThemeState(newTheme);
    if (typeof window === 'undefined') return;
    localStorage.setItem('theme', newTheme);
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    if (newTheme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(newTheme);
    }
  };

  // Close settings panel when clicking outside
  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleLocale = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        aria-label="Open Settings"
        onClick={() => mounted && setIsOpen(!isOpen)}
        disabled={!mounted}
        className={cn(
          'p-2.5 rounded-md border border-border bg-background/80 backdrop-blur-md hover:bg-muted transition-all duration-200 cursor-pointer active:scale-95 shadow-lg',
          isOpen && 'bg-muted ring-1 ring-primary/20 border-primary/30'
        )}
      >
        <Settings size={18} className={cn('text-foreground transition-transform duration-500', isOpen && 'rotate-90 text-primary', !mounted && 'animate-pulse')} />
      </button>

      {mounted && isOpen && (
        <div
          className="absolute right-0 mt-3 w-64 bg-background/95 border border-border backdrop-blur-md z-[100] overflow-hidden rounded-none shadow-2xl p-4 origin-top-right animate-in fade-in slide-in-from-top-2 zoom-in-95 duration-200 ease-out"
          role="region"
          aria-label="System Settings Menu"
        >
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-border">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground italic">
              {t('title')}
            </span>
            <button 
              aria-label={t('close')}
              onClick={() => setIsOpen(false)} 
              className="p-1 hover:bg-white/5 rounded transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>

          {/* Language Selection Segment */}
          <div className="space-y-2 mb-6">
            <div className="flex items-center gap-2 text-[9px] font-bold text-primary uppercase tracking-widest mb-3">
              <Languages size={12} />
              {t('language')}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {['es', 'en'].map((loc) => (
                <button
                  key={loc}
                  aria-label={loc.toUpperCase()}
                  onClick={() => toggleLocale(loc)}
                  className={cn(
                    'flex items-center justify-between px-3 py-2 text-[10px] font-bold uppercase transition-all duration-200 border cursor-pointer rounded-none',
                    locale === loc 
                      ? 'bg-primary/10 border-primary/30 text-primary' 
                      : 'bg-white/[0.02] border-border hover:bg-white/5 text-muted-foreground'
                  )}
                >
                  {loc}
                  {locale === loc && <Check size={10} />}
                </button>
              ))}
            </div>
          </div>

          {/* Theme Selection Segment */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[9px] font-bold text-primary uppercase tracking-widest mb-3">
              <Monitor size={12} />
              {t('theme')}
            </div>
            <div className="flex flex-col gap-1.5">
              {[
                { id: 'light', icon: Sun, label: t('theme_light') },
                { id: 'dark', icon: Moon, label: t('theme_dark') },
                { id: 'system', icon: Monitor, label: t('theme_system') }
              ].map((item) => (
                <button
                  key={item.id}
                  aria-label={item.label}
                  onClick={() => setTheme(item.id)}
                  className={cn(
                    'flex items-center justify-between px-3 py-2 text-[10px] font-bold uppercase transition-all duration-200 border cursor-pointer rounded-none',
                    theme === item.id 
                      ? 'bg-primary/10 border-primary/30 text-primary' 
                      : 'bg-white/[0.02] border-border hover:bg-white/5 text-muted-foreground'
                  )}
                >
                  <item.icon size={12} />
                  <span className="flex-1 text-left ml-2">{item.label}</span>
                  {theme === item.id && <Check size={10} />}
                </button>
              ))}
            </div>
          </div>

          {/* Federated Signout Trigger */}
          <div className="mt-6 pt-4 border-t border-border">
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/api/auth/logout"
              className="w-full flex items-center gap-3 px-3 py-2.5 bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 transition-all duration-200 text-[10px] font-bold uppercase cursor-pointer rounded-none"
            >
              <LogOut size={14} />
              <span>{t('logout')}</span>
            </a>
          </div>

          <div className="mt-4 text-center">
            <span className="text-[8px] font-mono uppercase tracking-[0.3em] text-muted-foreground/30">
              {'ABD_QUIZ_V0.1'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
