'use client';

import { useState, useRef, useCallback } from 'react';
import { Download, Loader2, AlertTriangle } from 'lucide-react';

interface FieldOption {
  value: string;
  label: string;
}

interface FieldConfig {
  name: string;
  label: string;
  type: 'date' | 'select';
  defaultValue?: string;
  options?: FieldOption[];
}

interface Props {
  endpoint: string;
  filename: string;
  fields: FieldConfig[];
}

interface ReportData {
  reportType: string;
  title: string;
  generatedAt: string;
  filters: string[];
  kpis: { label: string; value: number }[];
  columns: string[];
  rows: string[][];
}

// ─── Cores Fluxo ───
const C = {
  primary: [0, 102, 255] as [number, number, number],
  primaryDark: [0, 82, 204] as [number, number, number],
  navy: [10, 31, 61] as [number, number, number],
  cyan: [0, 242, 254] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  slate50: [248, 250, 252] as [number, number, number],
  slate200: [226, 232, 240] as [number, number, number],
  slate500: [100, 116, 139] as [number, number, number],
  slate700: [51, 65, 85] as [number, number, number],
  emerald: [5, 150, 105] as [number, number, number],
};

async function generatePdf(data: ReportData, filename: string) {
  // Importa jsPDF dinamicamente (carregado sob demanda no browser)
  const jsPDFModule = await import('jspdf');
  const jsPDF = jsPDFModule.jsPDF || jsPDFModule.default;
  const autoTableModule = await import('jspdf-autotable');
  const autoTable = autoTableModule.default || autoTableModule;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const mx = 14; // margin x
  const cw = pw - mx * 2; // content width

  // ─── Header com fundo azul ───
  function drawHeader() {
    // Faixa azul
    doc.setFillColor(...C.primary);
    doc.rect(0, 0, pw, 28, 'F');
    // Faixa mais escura à direita
    doc.setFillColor(...C.primaryDark);
    doc.rect(pw * 0.55, 0, pw * 0.45, 28, 'F');
    // Linha ciano
    doc.setFillColor(...C.cyan);
    doc.rect(0, 28, pw, 1.5, 'F');

    // Logo "F"
    doc.setFillColor(...C.white);
    doc.roundedRect(mx, 5, 18, 18, 3, 3, 'F');
    doc.setTextColor(...C.primary);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('F', mx + 6.5, 17);

    // Texto "FLUXO SUPORTE"
    doc.setTextColor(...C.white);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('FLUXO SUPORTE', mx + 22, 13);

    doc.setTextColor(...C.cyan);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.text('DIGITAL TECH', mx + 22, 18, { charSpace: 1 });

    // Título do relatório (direita)
    doc.setTextColor(...C.white);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(data.title.toUpperCase(), pw - mx, 13, { align: 'right' });

    // Data
    const genDate = new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    }).format(new Date(data.generatedAt));
    doc.setTextColor(180, 220, 255);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(genDate, pw - mx, 19, { align: 'right' });
  }

  // ─── Footer ───
  function drawFooter(pageNum: number, totalPages: number) {
    doc.setDrawColor(...C.slate200);
    doc.setLineWidth(0.3);
    doc.line(mx, ph - 10, pw - mx, ph - 10);
    doc.setFontSize(6);
    doc.setTextColor(...C.slate500);
    doc.setFont('helvetica', 'normal');
    doc.text('Fluxo Digital Tech · ti@fluxodigitaltech.com.br', mx, ph - 6);
    doc.text(`Página ${pageNum} de ${totalPages}`, pw - mx, ph - 6, { align: 'right' });
  }

  drawHeader();
  let y = 34;

  // ─── Filtros ───
  if (data.filters.length > 0) {
    doc.setFillColor(...C.slate50);
    doc.setDrawColor(...C.slate200);
    const fh = 6 + data.filters.length * 4.5;
    doc.roundedRect(mx, y, cw, fh, 2, 2, 'FD');
    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.slate500);
    doc.text('FILTROS APLICADOS', mx + 4, y + 4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...C.slate700);
    data.filters.forEach((f, i) => {
      doc.text(`• ${f}`, mx + 4, y + 8.5 + i * 4.5);
    });
    y += fh + 4;
  }

  // ─── KPIs ───
  if (data.kpis.length > 0) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.navy);
    // Barra de seção
    doc.setFillColor(...C.primary);
    doc.rect(mx, y, 1.5, 5, 'F');
    doc.text('TOTALIZADORES', mx + 4, y + 4);
    y += 8;

    const perRow = Math.min(data.kpis.length, 4);
    const gap = 3;
    const cardW = (cw - gap * (perRow - 1)) / perRow;
    const cardH = 18;

    data.kpis.forEach((k, i) => {
      const col = i % perRow;
      const row = Math.floor(i / perRow);
      const cx = mx + col * (cardW + gap);
      const cy = y + row * (cardH + gap);

      doc.setFillColor(...C.white);
      doc.setDrawColor(...C.slate200);
      doc.roundedRect(cx, cy, cardW, cardH, 2, 2, 'FD');

      // Barra topo colorida
      doc.setFillColor(...C.primary);
      doc.rect(cx, cy, cardW, 1.5, 'F');

      // Label
      doc.setFontSize(5.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...C.slate500);
      doc.text(k.label.toUpperCase(), cx + 3, cy + 6);

      // Valor
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...C.navy);
      doc.text(String(k.value), cx + 3, cy + 14);
    });

    const kpiRows = Math.ceil(data.kpis.length / perRow);
    y += kpiRows * (cardH + gap) + 4;
  }

  // ─── Tabela ───
  if (data.columns.length > 0 && data.rows.length > 0) {
    doc.setFillColor(...C.primary);
    doc.rect(mx, y, 1.5, 5, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.navy);
    doc.text('DADOS', mx + 4, y + 4);
    y += 8;

    // Use standalone autoTable function (works in both Node and browser)
    const atFn = typeof (doc as any).autoTable === 'function'
      ? (opts: any) => (doc as any).autoTable(opts)
      : (opts: any) => (autoTable as any)(doc, opts);

    atFn({
      startY: y,
      head: [data.columns],
      body: data.rows,
      margin: { left: mx, right: mx },
      styles: {
        fontSize: 7,
        cellPadding: 2,
        textColor: C.slate700,
        lineColor: C.slate200,
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: C.navy,
        textColor: C.white,
        fontSize: 7,
        fontStyle: 'bold',
        cellPadding: 3,
      },
      alternateRowStyles: {
        fillColor: C.slate50,
      },
      didDrawPage: () => {
        drawHeader();
      },
    });
  } else if (data.rows.length === 0) {
    doc.setFontSize(9);
    doc.setTextColor(...C.slate500);
    doc.text('Nenhum dado encontrado para os filtros aplicados.', mx, y + 6);
  }

  // ─── Footers em todas as páginas ───
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(i, totalPages);
  }

  // ─── Download ───
  doc.save(`${filename}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function ReportDownloadButton({ endpoint, filename, fields }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  const handleDownload = useCallback(async () => {
    if (!formRef.current) return;
    setError('');
    setLoading(true);

    try {
      // 1. Buscar dados JSON da API
      const formData = new FormData(formRef.current);
      const params = new URLSearchParams();
      formData.forEach((value, key) => {
        if (value) params.set(key, value.toString());
      });

      const url = `${endpoint}?${params.toString()}`;
      const res = await fetch(url);

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `Erro ${res.status}`);
      }

      const data: ReportData = await res.json();

      // 2. Gerar PDF no browser
      await generatePdf(data, filename);
    } catch (err: any) {
      console.error('[ReportDownloadButton]', err);
      setError(err?.message ?? 'Erro ao gerar relatório. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [endpoint, filename]);

  const gridCols =
    fields.length <= 2 ? 'md:grid-cols-2'
    : fields.length <= 3 ? 'md:grid-cols-3'
    : 'md:grid-cols-5';

  return (
    <div>
      <form ref={formRef} onSubmit={(e) => e.preventDefault()} className={`grid grid-cols-1 gap-3 ${gridCols}`}>
        {fields.map((field) => (
          <label key={field.name} className="block">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {field.label}
            </span>
            {field.type === 'date' ? (
              <input
                type="date"
                name={field.name}
                defaultValue={field.defaultValue}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />
            ) : (
              <select
                name={field.name}
                defaultValue={field.defaultValue ?? ''}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              >
                {field.options?.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            )}
          </label>
        ))}

        <div className={fields.length <= 2 ? 'md:col-span-2' : fields.length <= 3 ? 'md:col-span-3' : 'md:col-span-5'}>
          <button
            type="button"
            onClick={handleDownload}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-md bg-fluxo-500 px-5 py-2.5 text-sm font-semibold text-white shadow-fluxo transition hover:bg-fluxo-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Gerando PDF...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Baixar PDF
              </>
            )}
          </button>
        </div>
      </form>

      {error && (
        <div className="mt-3 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
