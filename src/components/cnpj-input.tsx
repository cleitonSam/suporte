'use client';

import { useState } from 'react';
import { formatCnpj } from '@/lib/cnpj';

interface Props extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'defaultValue'> {
  defaultValue?: string | null;
}

export function CnpjInput({ defaultValue, className, ...rest }: Props) {
  const [value, setValue] = useState(formatCnpj(defaultValue ?? ''));

  return (
    <input
      {...rest}
      type="text"
      inputMode="numeric"
      value={value}
      onChange={(e) => setValue(formatCnpj(e.target.value))}
      maxLength={18}
      placeholder="00.000.000/0001-00"
      className={
        className ??
        'mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm shadow-sm focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500'
      }
    />
  );
}
