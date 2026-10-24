import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@khomeeasy/shared-types', '@khomeeasy/scoring-engine'],
  experimental: {
    serverComponentsExternalPackages: ['@apple/app-store-server-library']
  },
  poweredByHeader: false
};

export default withNextIntl(nextConfig);
