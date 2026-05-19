// Next.js 14 instrumentation entrypoint.
// Carrega o Sentry config correto baseado no runtime.
// Ref: https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

export const onRequestError = async (
  ...args: Parameters<NonNullable<typeof import('@sentry/nextjs').captureRequestError>>
) => {
  const Sentry = await import('@sentry/nextjs');
  return Sentry.captureRequestError(...args);
};
