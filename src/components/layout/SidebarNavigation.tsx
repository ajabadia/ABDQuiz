'use client';

import { useState } from 'react';
import { Menu, X, BookOpen, Terminal, ShieldCheck, LogOut, BarChart2, LogIn, Home, AlertTriangle } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';

interface UserSession {
  authenticated: boolean;
  user?: {
    name: string;
    surname: string;
    email: string;
    role: string;
    branding?: {
      logoUrl?: string | null;
    } | null;
  };
}

interface SidebarNavigationProps {
  session: UserSession;
}

export function SidebarNavigation({ session }: SidebarNavigationProps) {
  const t = useTranslations('common');
  const locale = useLocale();
  const [isOpen, setIsOpen] = useState(false);

  const isLoggedIn = session.authenticated && !!session.user;
  const user = session.user;
  const isAdmin = isLoggedIn && user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN');

  const toggleSidebar = () => setIsOpen(!isOpen);

  return (
    <>
      {/* 🍔 Floating Trigger Button (Top-Left) */}
      <button
        onClick={toggleSidebar}
        type="button"
        aria-label={t('menuTitle')}
        aria-expanded={isOpen}
        className="fixed top-6 left-6 z-40 p-3 bg-background/80 backdrop-blur-md border border-border hover:border-primary/40 hover:bg-muted active:scale-95 text-foreground transition-all duration-200 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary/50 rounded-none shadow-lg"
      >
        <Menu className="w-5 h-5 text-foreground" aria-hidden="true" />
      </button>

      {/* 🌑 Dark Overlay Backdrop */}
      {isOpen && (
        <div
          onClick={toggleSidebar}
          onKeyDown={(e) => e.key === 'Escape' && toggleSidebar()}
          role="button"
          tabIndex={0}
          aria-label={t('close')}
          className="fixed inset-0 z-45 bg-black/70 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
        />
      )}

      {/* 🚀 Tactical Sidebar Drawer (Slides from left) */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-80 bg-background border-r border-border p-6 flex flex-col justify-between shadow-2xl transition-transform duration-300 ease-in-out transform rounded-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        role="navigation"
        aria-label="Sidebar Navigation"
      >
        {/* TOP SEGMENT: Brand & Navigation */}
        <div className="flex flex-col gap-8">
          
          {/* Header & Brand */}
          <div className="flex items-center justify-between border-b border-border pb-4">
            <Link
              href="/"
              onClick={toggleSidebar}
              className="hover:opacity-90 transition-opacity duration-200 cursor-pointer focus:outline-none flex items-center"
            >
              {user?.branding?.logoUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={user.branding.logoUrl}
                  alt="Logo"
                  className="max-h-8 w-auto object-contain"
                  onError={(e) => {
                    // Fallback to text logo if image fails to load
                    e.currentTarget.style.display = 'none';
                    const sib = e.currentTarget.nextElementSibling as HTMLElement;
                    if (sib) sib.style.display = 'inline';
                  }}
                />
              ) : null}
              <span 
                className={`text-xl font-black tracking-tighter text-foreground italic uppercase hover:text-primary transition-colors duration-200 ${
                  user?.branding?.logoUrl ? 'hidden' : 'inline'
                }`}
              >
                {t('brandPart1')}<span className="text-primary">{t('brandPart2')}</span>
              </span>
            </Link>
            <button
              onClick={toggleSidebar}
              type="button"
              aria-label={t('close')}
              className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-200 cursor-pointer focus:outline-none"
            >
              <X className="w-4.5 h-4.5" aria-hidden="true" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-2">
            
            {/* Link A.0: Public Welcome Page */}
            <Link
              href="/"
              onClick={toggleSidebar}
              className="flex items-center gap-4 px-4 py-3 bg-muted/10 border border-border hover:border-primary/20 hover:bg-primary/5 text-muted-foreground hover:text-primary transition-all duration-200 uppercase font-mono text-[10px] font-bold tracking-wider rounded-none"
            >
              <Home className="w-4 h-4 text-muted-foreground group-hover:text-primary" aria-hidden="true" />
              {t('welcomeMenu')}
            </Link>
            
            {/* Link A: Launch Exams (Simulador) */}
            <Link
              href="/exams"
              onClick={toggleSidebar}
              className="flex items-center gap-4 px-4 py-3 bg-muted/10 border border-border hover:border-primary/20 hover:bg-primary/5 text-muted-foreground hover:text-primary transition-all duration-200 uppercase font-mono text-[10px] font-bold tracking-wider rounded-none"
            >
              <BookOpen className="w-4 h-4 text-muted-foreground group-hover:text-primary" aria-hidden="true" />
              {t('homeMenu')}
            </Link>

            {/* Link A.2: History & Analytics (Only when logged in) */}
            {isLoggedIn && (
              <Link
                href="/history"
                onClick={toggleSidebar}
                className="flex items-center gap-4 px-4 py-3 bg-muted/10 border border-border hover:border-primary/20 hover:bg-primary/5 text-muted-foreground hover:text-primary transition-all duration-200 uppercase font-mono text-[10px] font-bold tracking-wider rounded-none"
              >
                <BarChart2 className="w-4 h-4 text-muted-foreground group-hover:text-primary" aria-hidden="true" />
                {t('historyMenu')}
              </Link>
            )}

            {/* Link B: Administration (Only for admins) */}
            {isLoggedIn && isAdmin && (
              <Link
                href="/admin"
                onClick={toggleSidebar}
                className="flex items-center gap-4 px-4 py-3 bg-muted/10 border border-border hover:border-primary/20 hover:bg-primary/5 text-muted-foreground hover:text-primary transition-all duration-200 uppercase font-mono text-[10px] font-bold tracking-wider rounded-none"
              >
                <Terminal className="w-4 h-4 text-muted-foreground group-hover:text-primary" aria-hidden="true" />
                {t('adminMenu')}
              </Link>
            )}

            {/* Link B.2: Allegations (Only for admins) */}
            {isLoggedIn && isAdmin && (
              <Link
                href="/admin/allegations"
                onClick={toggleSidebar}
                className="flex items-center gap-4 px-4 py-3 bg-muted/10 border border-border hover:border-primary/20 hover:bg-primary/5 text-muted-foreground hover:text-primary transition-all duration-200 uppercase font-mono text-[10px] font-bold tracking-wider rounded-none"
              >
                <AlertTriangle className="w-4 h-4 text-muted-foreground group-hover:text-primary" aria-hidden="true" />
                {t('claimsMenu')}
              </Link>
            )}

          </nav>
        </div>

        {/* BOTTOM SEGMENT: Cyber-Industrial User Card / Access Trigger */}
        <div className="flex flex-col gap-4 border-t border-border pt-6">
          {isLoggedIn && user ? (
            <div className="flex items-center justify-between">
              
              {/* User Credentials details */}
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-black tracking-wider text-foreground uppercase">
                  {user.name} {user.surname}
                </span>
                <div className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                  <span className="font-mono text-[8px] text-muted-foreground/80 uppercase tracking-wider">
                    {user.email}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5">
                {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                <a
                  href="/api/auth/logout"
                  className="p-2 hover:bg-red-500/10 text-muted-foreground hover:text-red-400 border border-border hover:border-red-500/20 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-1 focus:ring-red-400/50"
                  title={t('logout')}
                  aria-label={t('logout')}
                >
                  <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                </a>
              </div>

            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2" aria-hidden="true">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
                <span className="font-mono text-[9px] text-muted-foreground/80 uppercase tracking-widest">
                  {t('disconnectedSession')}
                </span>
              </div>
              <Link
                href="/exams"
                onClick={toggleSidebar}
                className="w-full h-10 bg-primary hover:bg-primary/95 text-primary-foreground font-mono text-[9px] font-black uppercase tracking-widest transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 border-b-2 border-primary-foreground/10 active:border-b-0 active:translate-y-[1px] outline-none"
              >
                <LogIn className="w-3.5 h-3.5" />
                {t('login')}
              </Link>
            </div>
          )}
        </div>

      </div>
    </>
  );
}
