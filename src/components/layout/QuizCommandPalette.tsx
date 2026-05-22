'use client';

import React from 'react';
import { useRouter, usePathname } from '@/i18n/routing';
import { useLocale } from 'next-intl';
import { CommandPalette, Command } from '@abd/ecosystem-widgets';
import { FileText, Clock, PenTool, Terminal, Globe, LogOut, Settings } from 'lucide-react';

export function QuizCommandPalette() {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();

  const commands: Command[] = [
    // Navigation Category
    {
      id: 'nav-exams',
      title: locale === 'es' ? 'Exámenes Activos' : 'Active Exams',
      description: locale === 'es' ? 'Ver evaluaciones disponibles' : 'View available assessments',
      category: locale === 'es' ? 'Académico' : 'Academic',
      shortcut: ['g', 'e'],
      icon: <FileText className="w-4 h-4" />,
      action: () => {
        router.push('/exams');
      }
    },
    {
      id: 'nav-history',
      title: locale === 'es' ? 'Historial y Notas' : 'History & Grades',
      description: locale === 'es' ? 'Consultar resultados previos' : 'Check previous results',
      category: locale === 'es' ? 'Académico' : 'Academic',
      shortcut: ['g', 'h'],
      icon: <Clock className="w-4 h-4" />,
      action: () => {
        router.push('/history');
      }
    },
    {
      id: 'nav-examinar',
      title: locale === 'es' ? 'Modo Examinador' : 'Examiner Mode',
      description: locale === 'es' ? 'Crear o calificar pruebas' : 'Create or grade exams',
      category: locale === 'es' ? 'Administración' : 'Administration',
      shortcut: ['g', 'x'],
      icon: <PenTool className="w-4 h-4" />,
      action: () => {
        router.push('/examinar');
      }
    },
    {
      id: 'nav-admin',
      title: locale === 'es' ? 'Panel de Administración' : 'Admin Panel',
      description: locale === 'es' ? 'Configuración central de la plataforma' : 'Core platform configuration',
      category: locale === 'es' ? 'Administración' : 'Administration',
      shortcut: ['g', 'a'],
      icon: <Terminal className="w-4 h-4" />,
      action: () => {
        router.push('/admin');
      }
    },
    // Configuration / Action Category
    {
      id: 'action-language',
      title: locale === 'es' ? 'Switch to English' : 'Cambiar a Español',
      description: locale === 'es' ? 'Change layout language to English' : 'Cambiar el idioma a Español',
      category: locale === 'es' ? 'Configuración' : 'Settings',
      shortcut: ['c', 'l'],
      icon: <Globe className="w-4 h-4" />,
      action: () => {
        const nextLocale = locale === 'es' ? 'en' : 'es';
        router.replace(pathname, { locale: nextLocale });
      }
    },
    {
      id: 'action-settings',
      title: locale === 'es' ? 'Abrir Panel de Configuración' : 'Open System Settings',
      description: locale === 'es' ? 'Ajustar temas visuales e idioma' : 'Adjust theme modes and language',
      category: locale === 'es' ? 'Configuración' : 'Settings',
      shortcut: ['c', 's'],
      icon: <Settings className="w-4 h-4" />,
      action: () => {
        const settingsBtn = document.querySelector('[aria-label="Open Settings"]') as HTMLButtonElement;
        if (settingsBtn) {
          settingsBtn.click();
        }
      }
    },
    {
      id: 'action-logout',
      title: locale === 'es' ? 'Cerrar Sesión' : 'Sign Out',
      description: locale === 'es' ? 'Finalizar sesión de forma segura' : 'Securely end your session',
      category: locale === 'es' ? 'Configuración' : 'Settings',
      shortcut: ['q', 'q'],
      icon: <LogOut className="w-4 h-4" />,
      action: () => {
        window.location.href = '/api/auth/logout';
      }
    }
  ];

  return (
    <CommandPalette
      commands={commands}
      placeholder={locale === 'es' ? 'Escribe un comando o busca un examen...' : 'Type a command or search exams...'}
    />
  );
}
