import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin(
  './src/i18n/request.ts'
);

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@abd/styles'],
  // Configuración de Next.js 16
  experimental: {
    // Si necesitas features experimentales de 2026 actívalas aquí
  }
};

export default withNextIntl(nextConfig);
