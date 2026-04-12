/**
 * Utilitário simples para gerar CSV a partir de dados tabulares.
 * Escapa campos com aspas quando necessário (RFC 4180).
 */

export function toCsv(headers: string[], rows: string[][]): string {
  const escape = (val: string) => {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const lines = [
    headers.map(escape).join(','),
    ...rows.map((row) => row.map((cell) => escape(cell ?? '')).join(',')),
  ];

  // BOM para Excel interpretar UTF-8
  return '\uFEFF' + lines.join('\r\n');
}

export function csvResponse(csv: string, filename: string): Response {
  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
