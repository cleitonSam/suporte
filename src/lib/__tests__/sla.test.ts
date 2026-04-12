import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  computeSlaDeadlines,
  computeSlaSnapshot,
  formatMinutes,
  SLA_POLICIES,
} from '../sla';

describe('computeSlaDeadlines', () => {
  it('calcula deadlines corretos para URGENT', () => {
    const from = new Date('2026-01-10T10:00:00Z');
    const { firstResponseDueAt, resolutionDueAt } = computeSlaDeadlines('URGENT', from);

    expect(firstResponseDueAt).toEqual(new Date('2026-01-10T11:00:00Z')); // +1h
    expect(resolutionDueAt).toEqual(new Date('2026-01-10T14:00:00Z')); // +4h
  });

  it('calcula deadlines corretos para LOW', () => {
    const from = new Date('2026-01-10T10:00:00Z');
    const { firstResponseDueAt, resolutionDueAt } = computeSlaDeadlines('LOW', from);

    expect(firstResponseDueAt).toEqual(new Date('2026-01-10T18:00:00Z')); // +8h
    expect(resolutionDueAt).toEqual(new Date('2026-01-13T10:00:00Z')); // +72h
  });

  it('usa Date.now() como padrão', () => {
    const before = Date.now();
    const { firstResponseDueAt } = computeSlaDeadlines('MEDIUM');
    const after = Date.now();

    const expectedMin = before + SLA_POLICIES.MEDIUM.firstResponseHours * 3600_000;
    const expectedMax = after + SLA_POLICIES.MEDIUM.firstResponseHours * 3600_000;

    expect(firstResponseDueAt.getTime()).toBeGreaterThanOrEqual(expectedMin);
    expect(firstResponseDueAt.getTime()).toBeLessThanOrEqual(expectedMax);
  });
});

describe('computeSlaSnapshot', () => {
  const now = new Date('2026-01-10T12:00:00Z');

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('retorna on_track quando dentro do prazo', () => {
    const snap = computeSlaSnapshot({
      priority: 'MEDIUM',
      createdAt: new Date('2026-01-10T10:00:00Z'),
      firstResponseAt: null,
      firstResponseDueAt: new Date('2026-01-10T14:00:00Z'), // 2h restantes
      resolvedAt: null,
      resolutionDueAt: new Date('2026-01-11T10:00:00Z'), // 22h restantes
      status: 'OPEN',
    });

    expect(snap.firstResponse).toBe('on_track');
    expect(snap.resolution).toBe('on_track');
  });

  it('retorna breached quando vencido', () => {
    const snap = computeSlaSnapshot({
      priority: 'URGENT',
      createdAt: new Date('2026-01-10T08:00:00Z'),
      firstResponseAt: null,
      firstResponseDueAt: new Date('2026-01-10T09:00:00Z'), // venceu 3h atrás
      resolvedAt: null,
      resolutionDueAt: new Date('2026-01-10T12:00:00Z'), // vence agora
      status: 'IN_PROGRESS',
    });

    expect(snap.firstResponse).toBe('breached');
    expect(snap.resolution).toBe('breached');
  });

  it('retorna met quando resolvido dentro do prazo', () => {
    const snap = computeSlaSnapshot({
      priority: 'HIGH',
      createdAt: new Date('2026-01-10T08:00:00Z'),
      firstResponseAt: new Date('2026-01-10T09:00:00Z'),
      firstResponseDueAt: new Date('2026-01-10T10:00:00Z'),
      resolvedAt: new Date('2026-01-10T11:00:00Z'),
      resolutionDueAt: new Date('2026-01-10T16:00:00Z'),
      status: 'RESOLVED',
    });

    expect(snap.firstResponse).toBe('met');
    expect(snap.resolution).toBe('met');
  });

  it('retorna warning quando em zona crítica', () => {
    // MEDIUM: first response 4h. 20% = 48min.
    // Se faltam 30min, deve ser warning.
    const snap = computeSlaSnapshot({
      priority: 'MEDIUM',
      createdAt: new Date('2026-01-10T08:00:00Z'),
      firstResponseAt: null,
      firstResponseDueAt: new Date('2026-01-10T12:30:00Z'), // faltam 30min (< 48min = 20% de 4h)
      resolvedAt: null,
      resolutionDueAt: new Date('2026-01-12T08:00:00Z'), // longe
      status: 'OPEN',
    });

    expect(snap.firstResponse).toBe('warning');
    expect(snap.resolution).toBe('on_track');
  });

  it('minutesToDeadline retorna minutos negativos quando vencido', () => {
    const snap = computeSlaSnapshot({
      priority: 'URGENT',
      createdAt: new Date('2026-01-10T08:00:00Z'),
      firstResponseAt: null,
      firstResponseDueAt: new Date('2026-01-10T09:00:00Z'), // venceu 3h atrás
      resolvedAt: null,
      resolutionDueAt: new Date('2026-01-10T11:00:00Z'), // venceu 1h atrás
      status: 'IN_PROGRESS',
    });

    expect(snap.minutesToDeadline).toBeLessThan(0);
  });
});

describe('formatMinutes', () => {
  it('formata null como —', () => {
    expect(formatMinutes(null)).toBe('—');
  });

  it('formata minutos sem hora', () => {
    expect(formatMinutes(35)).toBe('35min');
  });

  it('formata horas e minutos', () => {
    expect(formatMinutes(135)).toBe('2h 15min');
  });

  it('formata negativo', () => {
    expect(formatMinutes(-80)).toBe('-1h 20min');
  });

  it('formata zero', () => {
    expect(formatMinutes(0)).toBe('0min');
  });
});
