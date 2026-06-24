"use client"

/**
 * @purpose Gestiona configuraciones de tema y proporciona contexto para datos relacionados con el tema a lo largo de la aplicación.
 * @purpose_en Manages theme settings and provides a context for theme-related data across the application.
 * @refactorable false
 * @classification Context/Provider
 * @complexity Low
 * @fingerprint exports:1,imports:2,sig:15s0237
 * @lastUpdated 2026-06-23T19:50:09.906Z
 */

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const orig = console.error;
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].includes('Encountered a script tag')) return;
    orig.apply(console, args);
  };
}

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider {...props}>
      {children}
    </NextThemesProvider>
  )
}
