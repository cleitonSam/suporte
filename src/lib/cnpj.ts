/**
 * Utilitários de CNPJ: validação, formatação e desformatação.
 * Valida dígitos verificadores conforme algoritmo da Receita.
 */

export function stripCnpj(value: string | null | undefined): string {
  return (value ?? '').replace(/\D/g, '');
}

export function formatCnpj(value: string | null | undefined): string {
  const c = stripCnpj(value).slice(0, 14);
  if (c.length === 0) return '';
  if (c.length <= 2) return c;
  if (c.length <= 5) return `${c.slice(0, 2)}.${c.slice(2)}`;
  if (c.length <= 8) return `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5)}`;
  if (c.length <= 12) return `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8)}`;
  return `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8, 12)}-${c.slice(12)}`;
}

export function isValidCnpj(value: string | null | undefined): boolean {
  const cnpj = stripCnpj(value);
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1+$/.test(cnpj)) return false;

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  const calc = (slice: string, weights: number[]) => {
    let sum = 0;
    for (let i = 0; i < weights.length; i++) {
      sum += parseInt(slice[i] ?? '0', 10) * weights[i];
    }
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };

  const d1 = calc(cnpj.slice(0, 12), weights1);
  if (d1 !== parseInt(cnpj[12] ?? '', 10)) return false;
  const d2 = calc(cnpj.slice(0, 13), weights2);
  if (d2 !== parseInt(cnpj[13] ?? '', 10)) return false;

  return true;
}
