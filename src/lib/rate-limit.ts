// Rate limiter simples em memória (sliding window por chave).
// Suficiente para uma instância Next.js. Em multi-instância, trocar por Redis.

type Bucket = {
  hits: number[];
};

const buckets = new Map<string, Bucket>();

export interface RateLimitOptions {
  /** Janela de tempo em ms */
  windowMs: number;
  /** Máximo de hits permitidos na janela */
  max: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetMs: number;
}

/**
 * Verifica e registra um hit. Se estourar o limite, retorna `allowed: false`
 * e `resetMs` com o tempo até liberar.
 */
export function rateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const cutoff = now - opts.windowMs;

  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { hits: [] };
    buckets.set(key, bucket);
  }

  // Descarta hits antigos
  bucket.hits = bucket.hits.filter((t) => t > cutoff);

  if (bucket.hits.length >= opts.max) {
    const oldest = bucket.hits[0];
    return {
      allowed: false,
      remaining: 0,
      resetMs: Math.max(0, opts.windowMs - (now - oldest)),
    };
  }

  bucket.hits.push(now);
  return {
    allowed: true,
    remaining: opts.max - bucket.hits.length,
    resetMs: 0,
  };
}

/** Limpa o bucket de uma chave (ex: após login bem-sucedido). */
export function rateLimitReset(key: string) {
  buckets.delete(key);
}

/** Policies nomeadas para facilitar o uso. */
export const RATE_POLICIES = {
  login: { windowMs: 15 * 60 * 1000, max: 10 } satisfies RateLimitOptions,
  passwordReset: { windowMs: 60 * 60 * 1000, max: 5 } satisfies RateLimitOptions,
  createTicket: { windowMs: 10 * 60 * 1000, max: 20 } satisfies RateLimitOptions,
  reply: { windowMs: 60 * 1000, max: 15 } satisfies RateLimitOptions,
  search: { windowMs: 60 * 1000, max: 60 } satisfies RateLimitOptions,
  api: { windowMs: 60 * 1000, max: 120 } satisfies RateLimitOptions,
} as const;

// Limpeza periódica dos buckets vazios (evita leak)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const cutoff = Date.now() - 60 * 60 * 1000;
    for (const [key, b] of buckets.entries()) {
      if (b.hits.length === 0 || b.hits[b.hits.length - 1] < cutoff) {
        buckets.delete(key);
      }
    }
  }, 10 * 60 * 1000).unref?.();
}
