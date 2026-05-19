import { ShieldAlert, ShieldCheck, ShieldQuestion, Shield } from 'lucide-react';

interface Props {
  /** Data de fim da garantia. Null/undefined → "—". */
  expiresAt: Date | string | null | undefined;
  /** Janela em dias considerada "vencendo". Padrão 30. */
  warningDays?: number;
  /** Quando true, mostra apenas a pill compacta sem data. */
  compact?: boolean;
}

export function WarrantyBadge({ expiresAt, warningDays = 30, compact = false }: Props) {
  if (!expiresAt) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500 ring-1 ring-inset ring-slate-200 dark:bg-slate-700 dark:text-slate-400 dark:ring-slate-600">
        <ShieldQuestion className="h-3 w-3" aria-hidden="true" />
        Sem garantia
      </span>
    );
  }

  const date = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
  const now = new Date();
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysRemaining = Math.ceil((date.getTime() - now.getTime()) / msPerDay);

  const formatted = new Intl.DateTimeFormat('pt-BR').format(date);

  let tone: { bg: string; text: string; ring: string; icon: React.ComponentType<{ className?: string }>; label: string };

  if (daysRemaining < 0) {
    tone = {
      bg: 'bg-rose-500/10 dark:bg-rose-500/20',
      text: 'text-rose-700 dark:text-rose-300',
      ring: 'ring-rose-500/20',
      icon: ShieldAlert,
      label: compact ? 'Expirada' : `Expirou há ${Math.abs(daysRemaining)}d`,
    };
  } else if (daysRemaining <= warningDays) {
    tone = {
      bg: 'bg-amber-500/10 dark:bg-amber-500/20',
      text: 'text-amber-700 dark:text-amber-300',
      ring: 'ring-amber-500/20',
      icon: ShieldAlert,
      label: compact ? `${daysRemaining}d` : `Vence em ${daysRemaining}d`,
    };
  } else {
    tone = {
      bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
      text: 'text-emerald-700 dark:text-emerald-300',
      ring: 'ring-emerald-500/20',
      icon: ShieldCheck,
      label: compact ? 'Válida' : formatted,
    };
  }

  const Icon = tone.icon;
  const fullLabel =
    daysRemaining < 0
      ? `Garantia expirou em ${formatted}`
      : daysRemaining <= warningDays
        ? `Garantia vence em ${daysRemaining} dia(s) — ${formatted}`
        : `Garantia válida até ${formatted}`;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${tone.bg} ${tone.text} ${tone.ring}`}
      title={fullLabel}
      aria-label={fullLabel}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {tone.label}
    </span>
  );
}

/**
 * Categoriza estado de garantia para filtros / contagens.
 */
export function warrantyStatus(
  expiresAt: Date | null | undefined,
  warningDays = 30,
): 'none' | 'expired' | 'expiring' | 'ok' {
  if (!expiresAt) return 'none';
  const days = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0) return 'expired';
  if (days <= warningDays) return 'expiring';
  return 'ok';
}
