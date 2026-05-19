// Browser-side Sentry config.
// Carregado em todas as rotas do client. Só envia eventos se SENTRY_DSN
// estiver definido — em dev local fica no-op.

import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENV ?? 'production',
    release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,

    // Performance monitoring
    tracesSampleRate: 0.1,

    // Session replay (10% das sessões, 100% das com erro)
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    integrations: [
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],

    // Não enviar PII (LGPD): emails ficam mascarados a menos que
    // explicitamente liberados depois.
    sendDefaultPii: false,

    // Filtra erros comuns que não importam
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
      // Erros de extensão de browser
      'Extension context invalidated',
    ],
  });
}
