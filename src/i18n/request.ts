import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';

const locales = ['es', 'en'];

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = await requestLocale;
  
  if (!locale || !locales.includes(locale)) notFound();

  return {
    locale, // Requerido en la versión actual de next-intl
    messages: (await import(`../../messages/${locale}.json`)).default
  };
});
