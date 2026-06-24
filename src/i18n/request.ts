/**
 * @purpose Gestiona el recuperar y configurar mensajes locales específicos para la internacionalización en la aplicación ABDQuiz.
 * @purpose_en Manages the retrieval and configuration of locale-specific messages for internationalization in the ABDQuiz application.
 * @refactorable false
 * @classification Custom Hook
 * @complexity Low
 * @fingerprint exports:0,imports:2,sig:15kwxt7
 * @lastUpdated 2026-06-23T19:51:07.530Z
 */

import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
 
  if (!locale || !routing.locales.includes(locale as typeof routing.locales[number])) {
    locale = routing.defaultLocale;
  }
 
  const { locales: allMessages } = await import('@ajabadia/i18n');
  const messages = allMessages[locale as 'es' | 'en'];

  return {
    locale,
    messages
  };
});
