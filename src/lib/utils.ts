import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function formatRelative(date: Date | string) {
  const d = typeof date === 'string' ? new Date(date) : date;
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'agora mesmo';
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `há ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `há ${diffD}d`;
  return formatDate(d);
}

export const TICKET_STATUS_LABEL: Record<string, string> = {
  NEW: 'Novo',
  OPEN: 'Aberto',
  IN_PROGRESS: 'Em andamento',
  WAITING_CLIENT: 'Aguardando cliente',
  RESOLVED: 'Resolvido',
  CLOSED: 'Fechado',
  REOPENED: 'Reaberto',
};

export const TICKET_STATUS_COLOR: Record<string, string> = {
  NEW: 'bg-fluxo-100 text-fluxo-700',
  OPEN: 'bg-sky-100 text-sky-800',
  IN_PROGRESS: 'bg-amber-100 text-amber-800',
  WAITING_CLIENT: 'bg-purple-100 text-purple-800',
  RESOLVED: 'bg-emerald-100 text-emerald-800',
  CLOSED: 'bg-zinc-100 text-zinc-700',
  REOPENED: 'bg-rose-100 text-rose-800',
};

export const PRIORITY_LABEL: Record<string, string> = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
  URGENT: 'Urgente',
};

export const PRIORITY_COLOR: Record<string, string> = {
  LOW: 'bg-slate-100 text-slate-700',
  MEDIUM: 'bg-fluxo-100 text-fluxo-600',
  HIGH: 'bg-orange-100 text-orange-800',
  URGENT: 'bg-red-100 text-red-800',
};

export function nextTicketNumber(year: number, lastValue: number) {
  const seq = String(lastValue + 1).padStart(5, '0');
  return `CH-${year}-${seq}`;
}

export const TICKET_EVENT_LABEL: Record<string, string> = {
  CREATED: 'Chamado aberto',
  ASSIGNED: 'Atribuído',
  STATUS_CHANGED: 'Status alterado',
  PRIORITY_CHANGED: 'Prioridade alterada',
  COMMENTED: 'Nova mensagem',
  EQUIPMENT_LINKED: 'Equipamento vinculado',
  REOPENED: 'Reaberto',
  CLOSED: 'Fechado',
};

export function formatDuration(minutes: number): string {
  if (minutes <= 0) return '—';
  if (minutes < 60) return `${minutes} min`;
  const hours = minutes / 60;
  if (hours < 24) {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  const days = hours / 24;
  const d = Math.floor(days);
  const h = Math.round((days - d) * 24);
  return h > 0 ? `${d}d ${h}h` : `${d}d`;
}

export function formatDelta(curr: number, prev: number): {
  pct: number;
  direction: 'up' | 'down' | 'flat';
  label: string;
} {
  if (prev === 0 && curr === 0) return { pct: 0, direction: 'flat', label: 'sem variação' };
  if (prev === 0) return { pct: 100, direction: 'up', label: 'novo' };
  const diff = curr - prev;
  const pct = Math.round((diff / prev) * 100);
  const direction: 'up' | 'down' | 'flat' = diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat';
  const label = direction === 'flat' ? 'sem variação' : `${Math.abs(pct)}%`;
  return { pct: Math.abs(pct), direction, label };
}
