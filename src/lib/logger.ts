// Logger estruturado. Em dev, usa formatOptions simples; em prod, JSON puro para ingestão.
// Nota: não usamos transport/pino-pretty porque Next.js webpack não resolve corretamente
// o target de transport em server components.
import pino from 'pino';

const isProd = process.env.NODE_ENV === 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isProd ? 'info' : 'debug'),
  base: {
    app: 'fluxo-suporte',
    env: process.env.NODE_ENV ?? 'development',
  },
  // Sem transport — JSON puro em ambos os ambientes.
  // Para dev pretty-print, use: LOG_LEVEL=debug node server.js | npx pino-pretty
  redact: {
    paths: [
      '*.password',
      '*.passwordHash',
      '*.token',
      '*.tokenHash',
      'req.headers.authorization',
      'req.headers.cookie',
    ],
    remove: true,
  },
});

/** Factory para loggers contextualizados. */
export function child(bindings: Record<string, unknown>) {
  return logger.child(bindings);
}
