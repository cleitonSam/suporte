import { db } from '@/lib/db';

export interface MonthlyReportData {
  client: {
    id: string;
    name: string;
    legalName: string | null;
    cnpj: string | null;
  };
  period: {
    year: number;
    month: number;
    label: string; // "Maio/2026"
    start: Date;
    end: Date;
  };
  totals: {
    opened: number;     // chamados abertos no período
    resolved: number;   // chamados resolvidos no período
    closed: number;     // chamados fechados no período
    inProgress: number; // chamados ainda em andamento ao fim do período
  };
  sla: {
    onTime: number;       // resolvidos dentro do SLA
    breached: number;     // resolvidos fora do SLA
    onTimePercent: number; // 0-100
  };
  timeMetrics: {
    avgResolutionMinutes: number | null;
    avgFirstResponseMinutes: number | null;
  };
  csat: {
    surveys: number;
    avgRating: number | null; // 1-5
    promoters: number;        // 4-5
    detractors: number;       // 1-2
  };
  priorityBreakdown: Array<{ priority: string; count: number }>;
  topTickets: Array<{
    ticketNumber: string;
    title: string;
    status: string;
    priority: string;
    createdAt: Date;
    resolvedAt: Date | null;
  }>;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export function periodBounds(year: number, month: number) {
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 1, 0, 0, 0));
  return { start, end };
}

export async function generateMonthlyReportData(
  clientId: string,
  year: number,
  month: number
): Promise<MonthlyReportData | null> {
  const client = await db.client.findFirst({
    where: { id: clientId, deletedAt: null },
    select: { id: true, name: true, legalName: true, cnpj: true },
  });
  if (!client) return null;

  const { start, end } = periodBounds(year, month);

  // Chamados ABERTOS no período (não-arquivados)
  const opened = await db.ticket.count({
    where: { clientId, deletedAt: null, createdAt: { gte: start, lt: end } },
  });

  // Chamados RESOLVIDOS no período
  const resolvedTickets = await db.ticket.findMany({
    where: {
      clientId,
      deletedAt: null,
      resolvedAt: { gte: start, lt: end },
    },
    select: {
      id: true,
      createdAt: true,
      resolvedAt: true,
      resolutionDueAt: true,
      firstResponseDueAt: true,
    },
  });

  const closed = await db.ticket.count({
    where: {
      clientId,
      deletedAt: null,
      closedAt: { gte: start, lt: end },
    },
  });

  const inProgress = await db.ticket.count({
    where: {
      clientId,
      deletedAt: null,
      status: { in: ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_CLIENT', 'REOPENED'] },
      createdAt: { lt: end },
    },
  });

  // SLA
  let onTime = 0;
  let breached = 0;
  let totalResolutionMs = 0;
  let countWithResolution = 0;

  for (const t of resolvedTickets) {
    if (!t.resolvedAt) continue;
    const elapsed = t.resolvedAt.getTime() - t.createdAt.getTime();
    totalResolutionMs += elapsed;
    countWithResolution++;

    if (t.resolutionDueAt) {
      if (t.resolvedAt <= t.resolutionDueAt) onTime++;
      else breached++;
    } else {
      onTime++;
    }
  }

  const onTimePercent =
    onTime + breached === 0 ? 100 : Math.round((onTime / (onTime + breached)) * 100);
  const avgResolutionMinutes =
    countWithResolution > 0 ? Math.round(totalResolutionMs / countWithResolution / 60000) : null;

  // CSAT do período (respondido no período)
  const surveys = await db.csatSurvey.findMany({
    where: {
      ticket: { clientId },
      answeredAt: { gte: start, lt: end },
    },
    select: { rating: true },
  });

  const csatAvg =
    surveys.length > 0
      ? Math.round((surveys.reduce((a, s) => a + s.rating, 0) / surveys.length) * 10) / 10
      : null;
  const promoters = surveys.filter((s) => s.rating >= 4).length;
  const detractors = surveys.filter((s) => s.rating <= 2).length;

  // Quebra por prioridade (chamados abertos no período)
  const priorityRows = await db.ticket.groupBy({
    by: ['priority'],
    where: { clientId, deletedAt: null, createdAt: { gte: start, lt: end } },
    _count: { id: true },
  });
  const priorityBreakdown = priorityRows.map((r) => ({
    priority: r.priority,
    count: r._count.id,
  }));

  // Top 10 tickets do período (mais recentes)
  const topTickets = await db.ticket.findMany({
    where: { clientId, deletedAt: null, createdAt: { gte: start, lt: end } },
    select: {
      ticketNumber: true,
      title: true,
      status: true,
      priority: true,
      createdAt: true,
      resolvedAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 15,
  });

  return {
    client,
    period: {
      year,
      month,
      label: `${MONTH_NAMES[month - 1]}/${year}`,
      start,
      end,
    },
    totals: {
      opened,
      resolved: resolvedTickets.length,
      closed,
      inProgress,
    },
    sla: {
      onTime,
      breached,
      onTimePercent,
    },
    timeMetrics: {
      avgResolutionMinutes,
      avgFirstResponseMinutes: null, // TODO: implementar quando tiver firstResponseAt
    },
    csat: {
      surveys: surveys.length,
      avgRating: csatAvg,
      promoters,
      detractors,
    },
    priorityBreakdown,
    topTickets,
  };
}

const STATUS_LABEL: Record<string, string> = {
  NEW: 'Novo',
  OPEN: 'Aberto',
  IN_PROGRESS: 'Em andamento',
  WAITING_CLIENT: 'Aguardando cliente',
  RESOLVED: 'Resolvido',
  CLOSED: 'Fechado',
  REOPENED: 'Reaberto',
};

const PRIORITY_LABEL: Record<string, string> = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
  URGENT: 'Urgente',
};

function formatMinutes(min: number | null): string {
  if (min === null) return '—';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h < 24) return `${h}h ${m}min`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}

function formatDate(d: Date): string {
  const day = String(d.getUTCDate()).padStart(2, '0');
  const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${day}/${mo}/${d.getUTCFullYear()}`;
}

/**
 * Gera o PDF do relatório usando jsPDF (server-side).
 * Retorna Buffer pronto pra anexar em email.
 */
export async function generateMonthlyReportPdf(data: MonthlyReportData): Promise<Buffer> {
  const { jsPDF } = await import('jspdf');
  const autoTableModule = await import('jspdf-autotable');
  const autoTable = (autoTableModule as { default: typeof autoTableModule.default }).default
    ?? (autoTableModule as unknown as typeof autoTableModule.default);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();
  const mx = 14;

  // ── Cabeçalho com gradient simulado ──
  doc.setFillColor(0, 102, 255);
  doc.rect(0, 0, pw, 36, 'F');
  doc.setFillColor(10, 31, 61);
  doc.rect(0, 30, pw, 6, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Relatório Mensal de Atendimento', mx, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`${data.client.name}`, mx, 24);
  doc.text(`Período: ${data.period.label}`, pw - mx, 24, { align: 'right' });

  let y = 48;

  // ── KPIs (4 cards) ──
  doc.setTextColor(10, 31, 61);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Visão geral', mx, y);
  y += 4;

  const kpis = [
    { label: 'Chamados abertos', value: String(data.totals.opened) },
    { label: 'Resolvidos no mês', value: String(data.totals.resolved) },
    { label: 'SLA em dia', value: `${data.sla.onTimePercent}%` },
    {
      label: 'Tempo médio',
      value: formatMinutes(data.timeMetrics.avgResolutionMinutes),
    },
  ];

  const cardW = (pw - mx * 2 - 6) / 4;
  const cardH = 22;
  kpis.forEach((k, i) => {
    const x = mx + i * (cardW + 2);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, y, cardW, cardH, 2, 2, 'FD');
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(k.label.toUpperCase(), x + 4, y + 7);
    doc.setTextColor(10, 31, 61);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(k.value, x + 4, y + 17);
  });
  y += cardH + 8;

  // ── CSAT ──
  if (data.csat.surveys > 0 && data.csat.avgRating !== null) {
    doc.setFillColor(240, 253, 244);
    doc.setDrawColor(187, 247, 208);
    doc.roundedRect(mx, y, pw - mx * 2, 18, 2, 2, 'FD');
    doc.setTextColor(22, 101, 52);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(
      `Satisfação do mês: ${data.csat.avgRating.toFixed(1)}/5  ·  ${data.csat.surveys} respostas  ·  ${data.csat.promoters} promotores  ·  ${data.csat.detractors} detratores`,
      mx + 4,
      y + 11
    );
    y += 22;
  }

  // ── Tabela: prioridades ──
  if (data.priorityBreakdown.length > 0) {
    doc.setTextColor(10, 31, 61);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Distribuição por prioridade', mx, y);
    y += 2;
    autoTable(doc, {
      startY: y,
      head: [['Prioridade', 'Chamados']],
      body: data.priorityBreakdown.map((p) => [
        PRIORITY_LABEL[p.priority] ?? p.priority,
        String(p.count),
      ]),
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [0, 102, 255], textColor: 255 },
      margin: { left: mx, right: mx },
    });
    y = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y;
    y += 8;
  }

  // ── Tabela: chamados do período ──
  if (data.topTickets.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`Chamados do período (${data.topTickets.length})`, mx, y);
    y += 2;
    autoTable(doc, {
      startY: y,
      head: [['Número', 'Título', 'Prioridade', 'Status', 'Aberto', 'Resolvido']],
      body: data.topTickets.map((t) => [
        t.ticketNumber,
        t.title.length > 50 ? t.title.slice(0, 47) + '...' : t.title,
        PRIORITY_LABEL[t.priority] ?? t.priority,
        STATUS_LABEL[t.status] ?? t.status,
        formatDate(t.createdAt),
        t.resolvedAt ? formatDate(t.resolvedAt) : '—',
      ]),
      theme: 'striped',
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [0, 102, 255], textColor: 255 },
      margin: { left: mx, right: mx },
      columnStyles: {
        0: { cellWidth: 24 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 18 },
        3: { cellWidth: 26 },
        4: { cellWidth: 18 },
        5: { cellWidth: 18 },
      },
    });
  }

  // ── Footer ──
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Gerado por Fluxo Suporte · ${new Date().toLocaleString('pt-BR')} · Página ${i} de ${pageCount}`,
      pw / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'center' }
    );
  }

  const arr = doc.output('arraybuffer');
  return Buffer.from(arr);
}
