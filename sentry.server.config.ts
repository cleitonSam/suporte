// Server-side Sentry config (Node runtime).
// Carregado em rotas de API, server actions e SSR.

import * as Sentry from '@sentry/nextjs';

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENV ?? process.env.NODE_ENV ?? 'production',
    release: process.env.SENTRY_RELEASE,

    tracesSampleRate: 0.1,

    // Não enviar PII automaticamente (LGPD)
    sendDefaultPii: false,

    // Ignora erros de framework esperados (redirects e similares)
    ignoreErrors: [
      // Next.js redirect/notFound interno
      'NEXT_REDIRECT',
      'NEXT_NOT_FOUND',
    ],

    beforeSend(event) {
      // Pula erros que sejam só redirect interno do Next
      if (event.exception?.values?.[0]?.value?.includes('NEXT_REDIRECT')) {
        return null;
      }
      return event;
    },
  });
}
