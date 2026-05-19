'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { logger } from '@/lib/logger';
import {
  generateMonthlyReportData,
  generateMonthlyReportPdf,
} from '@/server/services/monthly-report-service';
import { sendMonthlyReportEmail } from '@/lib/email';

/**
 * Envia relatório mensal manualmente pra um cliente.
 * Aceita formData: clientId, year, month.
 * Se relatório do periodo ja existe, reenvia (upsert).
 */
export async function sendMonthlyReportNowAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.userType !== 'AGENT') redirect('/admin?error=forbidden');

  const clientId = formData.get('clientId') as string | null;
  const yearStr = formData.get('year') as string | null;
  const monthStr = formData.get('month') as string | null;
  const returnTo = (formData.get('returnTo') as string | null) || `/admin/clientes/${clientId}`;

  if (!clientId || !yearStr || !monthStr) {
    redirect(`${returnTo}?error=validation`);
  }

  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    redirect(`${returnTo}?error=validation`);
  }

  try {
    const data = await generateMonthlyReportData(clientId!, year, month);
    if (!data) {
      redirect(`${returnTo}?error=not_found`);
    }

    const contacts = await db.user.findMany({
      where: {
        clientId: clientId!,
        userType: 'CLIENT_CONTACT',
        isActive: true,
        deletedAt: null,
        email: { not: '' },
      },
      select: { email: true },
    });

    const recipients = contacts.map((u) => u.email).filter(Boolean);
    if (recipients.length === 0) {
      redirect(`${returnTo}?error=sem_contatos`);
    }

    const pdf = await generateMonthlyReportPdf(data!);

    const ok = await sendMonthlyReportEmail({
      to: recipients,
      clientName: data!.client.name,
      periodLabel: data!.period.label,
      totals: { opened: data!.totals.opened, resolved: data!.totals.resolved },
      slaPercent: data!.sla.onTimePercent,
      csatAvg: data!.csat.avgRating,
      pdfBuffer: pdf,
    });

    await db.monthlyReport.upsert({
      where: { clientId_year_month: { clientId: clientId!, year, month } },
      create: {
        clientId: clientId!,
        year,
        month,
        sentTo: recipients,
        status: ok ? 'sent' : 'failed',
        metrics: data as object,
        triggeredBy: session.user.id,
      },
      update: {
        sentAt: new Date(),
        sentTo: recipients,
        status: ok ? 'sent' : 'failed',
        metrics: data as object,
        triggeredBy: session.user.id,
      },
    });

    await audit({
      action: 'monthly_report.sent',
      actorId: session.user.id,
      entity: 'Client',
      entityId: clientId!,
      metadata: {
        year,
        month,
        recipients: recipients.length,
        status: ok ? 'sent' : 'failed',
      },
    });
  } catch (err) {
    logger.error({ err, clientId, year, month }, '[sendMonthlyReportNow] erro');
    redirect(`${returnTo}?error=internal_error`);
  }

  revalidatePath(`/admin/clientes/${clientId}`);
  redirect(`${returnTo}?ok=relatorio.enviado`);
}
