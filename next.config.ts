import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin(
  './src/i18n/request.ts'
);

/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  transpilePackages: ['@ajabadia/ecosystem-widgets', '@ajabadia/styles', '@ajabadia/satellite-sdk', 'next-intl'],
};

export default withNextIntl(nextConfig);
