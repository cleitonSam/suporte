import PDFDocument from 'pdfkit';

// ─────────────────────────────────────────────
// Paleta Fluxo Digital Tech
// ─────────────────────────────────────────────
export const FLUXO_COLORS = {
  primary: '#0066FF',
  primaryDark: '#0052CC',
  primaryDarker: '#003D99',
  navy: '#0A1F3D',
  cyan: '#00F2FE',
  cyanLight: '#66F6FE',

  slate900: '#0F172A',
  slate700: '#334155',
  slate600: '#475569',
  slate500: '#64748B',
  slate400: '#94A3B8',
  slate300: '#CBD5E1',
  slate200: '#E2E8F0',
  slate100: '#F1F5F9',
  slate50: '#F8FAFC',

  emerald: '#059669',
  amber: '#D97706',
  rose: '#E11D48',
  red: '#DC2626',

  white: '#FFFFFF',
};

export const STATUS_LABEL: Record<string, string> = {
  NEW: 'Novo',
  OPEN: 'Aberto',
  IN_PROGRESS: 'Em andamento',
  WAITING_CLIENT: 'Aguardando cliente',
  RESOLVED: 'Resolvido',
  CLOSED: 'Fechado',
  REOPENED: 'Reaberto',
};

export const STATUS_COLOR: Record<string, string> = {
  NEW: FLUXO_COLORS.primary,
  OPEN: '#0284C7',
  IN_PROGRESS: FLUXO_COLORS.amber,
  WAITING_CLIENT: '#9333EA',
  RESOLVED: FLUXO_COLORS.emerald,
  CLOSED: FLUXO_COLORS.slate500,
  REOPENED: FLUXO_COLORS.rose,
};

export const PRIORITY_LABEL: Record<string, string> = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
  URGENT: 'Urgente',
};

export const PRIORITY_COLOR: Record<string, string> = {
  LOW: FLUXO_COLORS.slate500,
  MEDIUM: FLUXO_COLORS.primary,
  HIGH: '#EA580C',
  URGENT: FLUXO_COLORS.red,
};

// ─────────────────────────────────────────────
// Helpers de formatação
// ─────────────────────────────────────────────
export function formatBR(date: Date | string | null | undefined) {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function formatBRDate(date: Date | string | null | undefined) {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

// ─────────────────────────────────────────────
// Document factory
// ─────────────────────────────────────────────
export interface FluxoPdfOptions {
  title: string;
  subtitle?: string;
  filters?: string[];
}

export class FluxoPdf {
  doc: InstanceType<typeof PDFDocument>;
  opts: FluxoPdfOptions;
  pageWidth: number;
  pageHeight: number;
  margin = 40;
  contentWidth: number;

  constructor(opts: FluxoPdfOptions) {
    this.opts = opts;
    this.doc = new PDFDocument({
      size: 'A4',
      margin: this.margin,
      info: {
        Title: opts.title,
        Author: 'Fluxo Digital Tech',
        Subject: opts.subtitle ?? 'Relatório',
        Creator: 'Fluxo Suporte',
      },
      bufferPages: true,
    });
    this.pageWidth = this.doc.page.width;
    this.pageHeight = this.doc.page.height;
    this.contentWidth = this.pageWidth - this.margin * 2;

    this.drawHeader();
    // Move cursor abaixo do header
    this.doc.y = 140;
  }

  // ──────────────────────────────────────────
  // Header com faixa azul + acento ciano
  // ──────────────────────────────────────────
  drawHeader() {
    const d = this.doc;
    // Fundo azul principal
    d.rect(0, 0, this.pageWidth, 110).fill(FLUXO_COLORS.primary);

    // Faixa diagonal mais escura (efeito "gradiente")
    d.save();
    d.rect(0, 0, this.pageWidth, 110).clip();
    d.rect(this.pageWidth * 0.6, -20, this.pageWidth * 0.6, 150)
      .fill(FLUXO_COLORS.primaryDark);
    d.restore();

    // Linha ciano de acento
    d.rect(0, 110, this.pageWidth, 4).fill(FLUXO_COLORS.cyan);

    // Logo mark — quadrado arredondado
    const logoX = this.margin;
    const logoY = 30;
    d.roundedRect(logoX, logoY, 52, 52, 10).fill(FLUXO_COLORS.white);
    // Inicial "F" centralizada
    d.fillColor(FLUXO_COLORS.primary)
      .fontSize(28)
      .font('Helvetica-Bold')
      .text('F', logoX, logoY + 13, { width: 52, align: 'center' });

    // Título "FLUXO SUPORTE"
    d.fillColor(FLUXO_COLORS.white)
      .font('Helvetica-Bold')
      .fontSize(18)
      .text('FLUXO SUPORTE', logoX + 70, 36);

    d.fillColor(FLUXO_COLORS.cyan)
      .font('Helvetica')
      .fontSize(9)
      .text('DIGITAL TECH', logoX + 70, 58, { characterSpacing: 2 });

    // Título do relatório (lado direito)
    d.fillColor(FLUXO_COLORS.white)
      .font('Helvetica-Bold')
      .fontSize(13)
      .text(this.opts.title.toUpperCase(), this.margin, 78, {
        width: this.contentWidth,
        align: 'right',
      });

    if (this.opts.subtitle) {
      d.fillColor(FLUXO_COLORS.cyanLight)
        .font('Helvetica')
        .fontSize(9)
        .text(this.opts.subtitle, this.margin, 94, {
          width: this.contentWidth,
          align: 'right',
        });
    }
  }

  // ──────────────────────────────────────────
  // Bloco de filtros aplicados
  // ──────────────────────────────────────────
  drawFilters(filters: string[]) {
    if (!filters.length) return;
    const d = this.doc;
    const x = this.margin;
    const y = d.y;
    const h = 16 + filters.length * 14;

    d.roundedRect(x, y, this.contentWidth, h, 6)
      .fillAndStroke(FLUXO_COLORS.slate50, FLUXO_COLORS.slate200);

    d.fillColor(FLUXO_COLORS.slate500)
      .font('Helvetica-Bold')
      .fontSize(8)
      .text('FILTROS APLICADOS', x + 12, y + 8, { characterSpacing: 1 });

    d.font('Helvetica').fontSize(9).fillColor(FLUXO_COLORS.slate700);
    filters.forEach((f, i) => {
      d.text(`• ${f}`, x + 12, y + 22 + i * 14, { width: this.contentWidth - 24 });
    });

    d.y = y + h + 16;
  }

  // ──────────────────────────────────────────
  // Seção (título + linha azul)
  // ──────────────────────────────────────────
  drawSection(title: string) {
    this.ensureSpace(40);
    const d = this.doc;
    const y = d.y + 4;
    d.rect(this.margin, y, 4, 14).fill(FLUXO_COLORS.primary);
    d.fillColor(FLUXO_COLORS.navy)
      .font('Helvetica-Bold')
      .fontSize(12)
      .text(title, this.margin + 12, y, { characterSpacing: 0.3 });
    d.y = y + 22;
  }

  // ──────────────────────────────────────────
  // Grid de KPIs (4 por linha)
  // ──────────────────────────────────────────
  drawKpiGrid(kpis: { label: string; value: string | number; color?: string }[]) {
    this.ensureSpace(70);
    const d = this.doc;
    const perRow = 4;
    const gap = 10;
    const cardW = (this.contentWidth - gap * (perRow - 1)) / perRow;
    const cardH = 60;
    const startY = d.y;

    kpis.forEach((k, i) => {
      const col = i % perRow;
      const row = Math.floor(i / perRow);
      const x = this.margin + col * (cardW + gap);
      const y = startY + row * (cardH + gap);
      const color = k.color ?? FLUXO_COLORS.primary;

      // Card
      d.roundedRect(x, y, cardW, cardH, 8)
        .fillAndStroke(FLUXO_COLORS.white, FLUXO_COLORS.slate200);

      // Barra colorida topo
      d.save();
      d.roundedRect(x, y, cardW, cardH, 8).clip();
      d.rect(x, y, cardW, 4).fill(color);
      d.restore();

      // Label
      d.fillColor(FLUXO_COLORS.slate500)
        .font('Helvetica')
        .fontSize(8)
        .text(k.label.toUpperCase(), x + 10, y + 12, {
          width: cardW - 20,
          characterSpacing: 0.5,
        });

      // Valor
      d.fillColor(FLUXO_COLORS.navy)
        .font('Helvetica-Bold')
        .fontSize(20)
        .text(String(k.value), x + 10, y + 26, { width: cardW - 20 });
    });

    const rows = Math.ceil(kpis.length / perRow);
    d.y = startY + rows * (cardH + gap) + 6;
  }

  // ──────────────────────────────────────────
  // Tabela genérica
  // ──────────────────────────────────────────
  drawTable(params: {
    columns: { header: string; width: number; key: string; align?: 'left' | 'right' | 'center' }[];
    rows: Record<string, string>[];
    rowRenderer?: (row: Record<string, string>, key: string) => { text: string; color?: string } | null;
  }) {
    const { columns, rows, rowRenderer } = params;
    const d = this.doc;
    const totalWidth = columns.reduce((acc, c) => acc + c.width, 0);
    const scale = this.contentWidth / totalWidth;
    const cols = columns.map((c) => ({ ...c, width: c.width * scale }));

    const rowHeight = 22;
    const headerHeight = 24;

    // Header
    this.ensureSpace(headerHeight + rowHeight);
    let y = d.y;
    d.rect(this.margin, y, this.contentWidth, headerHeight).fill(FLUXO_COLORS.navy);
    d.fillColor(FLUXO_COLORS.white).font('Helvetica-Bold').fontSize(9);
    let x = this.margin + 8;
    cols.forEach((c) => {
      d.text(c.header.toUpperCase(), x, y + 8, {
        width: c.width - 8,
        align: c.align ?? 'left',
        characterSpacing: 0.4,
      });
      x += c.width;
    });
    y += headerHeight;

    // Rows
    rows.forEach((row, idx) => {
      if (y + rowHeight > this.pageHeight - 60) {
        this.doc.addPage();
        this.drawHeader();
        y = 140;
        // Re-render header da tabela na nova página
        d.rect(this.margin, y, this.contentWidth, headerHeight).fill(FLUXO_COLORS.navy);
        d.fillColor(FLUXO_COLORS.white).font('Helvetica-Bold').fontSize(9);
        let xh = this.margin + 8;
        cols.forEach((c) => {
          d.text(c.header.toUpperCase(), xh, y + 8, {
            width: c.width - 8,
            align: c.align ?? 'left',
            characterSpacing: 0.4,
          });
          xh += c.width;
        });
        y += headerHeight;
      }

      // Zebra
      if (idx % 2 === 0) {
        d.rect(this.margin, y, this.contentWidth, rowHeight).fill(FLUXO_COLORS.slate50);
      }

      d.font('Helvetica').fontSize(9);
      let cx = this.margin + 8;
      cols.forEach((c) => {
        const custom = rowRenderer ? rowRenderer(row, c.key) : null;
        const text = custom?.text ?? row[c.key] ?? '';
        const color = custom?.color ?? FLUXO_COLORS.slate700;
        d.fillColor(color).text(text, cx, y + 6, {
          width: c.width - 8,
          align: c.align ?? 'left',
          ellipsis: true,
          lineBreak: false,
        });
        cx += c.width;
      });

      // Linha divisória
      d.moveTo(this.margin, y + rowHeight)
        .lineTo(this.margin + this.contentWidth, y + rowHeight)
        .lineWidth(0.5)
        .strokeColor(FLUXO_COLORS.slate200)
        .stroke();

      y += rowHeight;
    });

    d.y = y + 10;
  }

  // ──────────────────────────────────────────
  // Caixa destacada (ex: resumo)
  // ──────────────────────────────────────────
  drawInfoBox(params: { title: string; lines: { label: string; value: string }[] }) {
    this.ensureSpace(60);
    const d = this.doc;
    const x = this.margin;
    const y = d.y;
    const h = 20 + params.lines.length * 16 + 10;

    d.roundedRect(x, y, this.contentWidth, h, 6)
      .fillAndStroke(FLUXO_COLORS.slate50, FLUXO_COLORS.slate200);
    // Barra lateral
    d.rect(x, y, 3, h).fill(FLUXO_COLORS.primary);

    d.fillColor(FLUXO_COLORS.navy)
      .font('Helvetica-Bold')
      .fontSize(10)
      .text(params.title, x + 12, y + 10);

    params.lines.forEach((l, i) => {
      const ly = y + 28 + i * 16;
      d.fillColor(FLUXO_COLORS.slate500).font('Helvetica').fontSize(9).text(l.label, x + 12, ly);
      d.fillColor(FLUXO_COLORS.navy)
        .font('Helvetica-Bold')
        .fontSize(9)
        .text(l.value, x + 12 + 140, ly, { width: this.contentWidth - 152 });
    });

    d.y = y + h + 12;
  }

  // ──────────────────────────────────────────
  // Texto simples
  // ──────────────────────────────────────────
  drawText(text: string, opts?: { color?: string; size?: number; bold?: boolean }) {
    this.ensureSpace(20);
    const d = this.doc;
    d.fillColor(opts?.color ?? FLUXO_COLORS.slate700)
      .font(opts?.bold ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(opts?.size ?? 10)
      .text(text, this.margin, d.y, { width: this.contentWidth });
    d.y += 6;
  }

  // ──────────────────────────────────────────
  // Garante espaço vertical; senão quebra página
  // ──────────────────────────────────────────
  ensureSpace(needed: number) {
    if (this.doc.y + needed > this.pageHeight - 60) {
      this.doc.addPage();
      this.drawHeader();
      this.doc.y = 140;
    }
  }

  // ──────────────────────────────────────────
  // Rodapé numerado em todas as páginas
  // ──────────────────────────────────────────
  drawFooters() {
    const d = this.doc;
    const range = d.bufferedPageRange();
    const total = range.count;
    const generatedAt = new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date());

    for (let i = 0; i < total; i++) {
      d.switchToPage(range.start + i);
      const footerY = this.pageHeight - 36;
      // Linha superior
      d.moveTo(this.margin, footerY)
        .lineTo(this.pageWidth - this.margin, footerY)
        .lineWidth(0.5)
        .strokeColor(FLUXO_COLORS.slate200)
        .stroke();

      d.fillColor(FLUXO_COLORS.slate500).font('Helvetica').fontSize(8);
      d.text(
        'Fluxo Digital Tech · ti@fluxodigitaltech.com.br · Suporte técnico especializado',
        this.margin,
        footerY + 8,
        { width: this.contentWidth, align: 'left' }
      );
      d.text(
        `Gerado em ${generatedAt}  ·  Página ${i + 1} de ${total}`,
        this.margin,
        footerY + 8,
        { width: this.contentWidth, align: 'right' }
      );
    }
  }

  // ──────────────────────────────────────────
  // Finaliza e retorna um Buffer
  // ──────────────────────────────────────────
  async toBuffer(): Promise<Buffer> {
    this.drawFooters();
    return await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      this.doc.on('data', (c: Buffer) => chunks.push(c));
      this.doc.on('end', () => resolve(Buffer.concat(chunks)));
      this.doc.on('error', reject);
      this.doc.end();
    });
  }
}

export function createFluxoPdf(opts: FluxoPdfOptions) {
  return new FluxoPdf(opts);
}
