import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin(
  './src/i18n/request.ts'
);

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@abd/ecosystem-widgets', '@abd/styles', '@abd/satellite-sdk', 'next-intl'],
  // Configuración de Next.js 16
  experimental: {
    // Si necesitas features experimentales de 2026 actívalas aquí
  }
};

export default withNextIntl(nextConfig);
