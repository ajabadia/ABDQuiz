/**
 * @purpose Gestiona la configuración de routing y herramientas para internacionalización en la aplicación ABDQuiz.
 * @purpose_en Defines routing configuration and utilities for internationalization in the ABDQuiz application.
 * @refactorable false
 * @classification Custom Hook
 * @complexity Low
 * @fingerprint exports:2,imports:2,sig:0ni6sy
 * @lastUpdated 2026-06-23T19:51:10.472Z
 */

import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
  locales: ['es', 'en'],
  defaultLocale: 'es',
  localePrefix: 'always'
});

export const { Link, redirect, usePathname, useRouter } = createNavigation(routing);
