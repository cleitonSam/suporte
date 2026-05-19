import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  generateMonthlyReportData,
  generateMonthlyReportPdf,
} from '@/server/services/monthly-report-service';
import { sendMonthlyReportEmail } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Cron: gera e envia relatório do MÊS ANTERIOR pra todos os clientes ACTIVE.
 *
 * Agendar pra dia 1 de cada mês, ~08:00. Idempotente (já tem unique
 * [clientId, year, month] em MonthlyReport, então reexecução não duplica).
 *
 * Override: ?year=2026&month=4 pra reprocessar período específico.
 *           ?clientId=xyz pra rodar só pra um cliente.
 *           ?force=1 pra ignorar registro existente (gera de novo).
 *
 * Auth: header x-cron-secret OU query ?secret=...
 */
async function handle(req: Request) {
  const secret = process.env.CRON_SECRET;
  const url = new URL(req.url);
  const provided = req.headers.get('x-cron-secret') ?? url.searchParams.get('secret');
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const now = new Date();
  const queryYear = url.searchParams.get('year');
  const queryMonth = url.searchParams.get('month');
  const queryClient = url.searchParams.get('clientId');
  const force = url.searchParams.get('force') === '1';

  // Default: mês anterior
  let year: number;
  let month: number;
  if (queryYear && queryMonth) {
    year = Number(queryYear);
    month = Number(queryMonth);
  } else {
    const ref = new Date(now.getUTCFullYear(), now.getUTCMonth() - 1, 1);
    year = ref.getUTCFullYear();
    month = ref.getUTCMonth() + 1;
  }

  const clients = await db.client.findMany({
    where: {
      status: 'ACTIVE',
      deletedAt: null,
      ...(queryClient ? { id: queryClient } : {}),
      users: {
        some: { userType: 'CLIENT_CONTACT', isActive: true, deletedAt: null },
      },
    },
    select: { id: true, name: true },
  });

  const results: Array<{ clientId: string; clientName: string; status: string; reason?: string }> = [];

  for (const c of clients) {
    try {
      // Skip se ja enviou (a menos que force)
      if (!force) {
        const existing = await db.monthlyReport.findUnique({
          where: { clientId_year_month: { clientId: c.id, year, month } },
        });
        if (existing) {
          results.push({ clientId: c.id, clientName: c.name, status: 'skipped_already_sent' });
          continue;
        }
      }

      const data = await generateMonthlyReportData(c.id, year, month);
      if (!data) {
        results.push({ clientId: c.id, clientName: c.name, status: 'skipped_no_data' });
        continue;
      }

      // Sem chamados no periodo? pula
      if (data.totals.opened === 0 && data.totals.resolved === 0 && data.totals.closed === 0) {
        results.push({ clientId: c.id, clientName: c.name, status: 'skipped_empty_period' });
        continue;
      }

      const contacts = await db.user.findMany({
        where: {
          clientId: c.id,
          userType: 'CLIENT_CONTACT',
          isActive: true,
          deletedAt: null,
          email: { not: '' },
        },
        select: { email: true },
      });

      const recipients = contacts.map((u) => u.email).filter(Boolean);
      if (recipients.length === 0) {
        results.push({ clientId: c.id, clientName: c.name, status: 'skipped_no_recipients' });
        continue;
      }

      const pdfBuffer = await generateMonthlyReportPdf(data);

      const ok = await sendMonthlyReportEmail({
        to: recipients,
        clientName: data.client.name,
        periodLabel: data.period.label,
        totals: { opened: data.totals.opened, resolved: data.totals.resolved },
        slaPercent: data.sla.onTimePercent,
        csatAvg: data.csat.avgRating,
        pdfBuffer,
      });

      // Registra (upsert pra suportar force=1)
      await db.monthlyReport.upsert({
        where: { clientId_year_month: { clientId: c.id, year, month } },
        create: {
          clientId: c.id,
          year,
          month,
          sentTo: recipients,
          status: ok ? 'sent' : 'failed',
          metrics: data as object,
          triggeredBy: null,
        },
        update: {
          sentAt: new Date(),
          sentTo: recipients,
          status: ok ? 'sent' : 'failed',
          metrics: data as object,
        },
      });

      results.push({ clientId: c.id, clientName: c.name, status: ok ? 'sent' : 'send_failed' });
    } catch (err) {
      logger.error({ err, clientId: c.id }, '[cron:monthly-reports] erro processando cliente');
      results.push({
        clientId: c.id,
        clientName: c.name,
        status: 'error',
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const summary = results.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  logger.info({ year, month, summary }, '[cron:monthly-reports] concluido');

  return NextResponse.json({
    ok: true,
    period: { year, month },
    summary,
    details: results,
  });
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}
