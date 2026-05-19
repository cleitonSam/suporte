import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverComponentsExternalPackages: ['pdfkit'],
    serverActions: {
      bodySizeLimit: '15mb',
    },
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
        ],
      },
      // PWA: permite que o service worker sirva páginas fora do escopo
      {
        source: '/sw.js',
        headers: [
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ];
  },
};

// Sentry — só ativa wrapper quando DSN estiver configurado em build/prod,
// evitando overhead em dev.
const enableSentry = Boolean(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN);

export default enableSentry
  ? withSentryConfig(nextConfig, {
      // Org / projeto Sentry (preencher quando criar conta)
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,

      // Silencia logs do plugin em build (a menos que CI=true)
      silent: !process.env.CI,

      // Upload de source maps só com auth token
      authToken: process.env.SENTRY_AUTH_TOKEN,

      // Some com source maps no client após upload pra não vazar código
      hideSourceMaps: true,

      // Tree-shake código de debug não usado
      disableLogger: true,

      // Sample rate de sessões e replays gerenciados em runtime configs
      widenClientFileUpload: true,
    })
  : nextConfig;
