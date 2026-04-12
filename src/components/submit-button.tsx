'use client';

import { useFormStatus } from 'react-dom';
import { Loader2 } from 'lucide-react';

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  pendingText?: string;
}

export function SubmitButton({
  children = 'Enviar',
  pendingText = 'Enviando...',
  className = '',
  disabled,
  ...rest
}: Props) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-md bg-fluxo-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-fluxo-600 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...rest}
    >
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {pending ? pendingText : children}
    </button>
  );
}
