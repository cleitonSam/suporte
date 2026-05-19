'use client';

import { useTransition, useRef } from 'react';
import type { EquipmentStatus } from '@prisma/client';
import { updateEquipmentStatusAction } from '@/server/actions/equipment';

const OPTIONS: Array<{ value: EquipmentStatus; label: string; tone: string }> = [
  { value: 'ACTIVE',    label: 'Ativo',      tone: 'bg-emerald-100 text-emerald-800 ring-emerald-200' },
  { value: 'IN_REPAIR', label: 'Em reparo',  tone: 'bg-amber-100 text-amber-800 ring-amber-200' },
  { value: 'RETIRED',   label: 'Desativado', tone: 'bg-slate-100 text-slate-600 ring-slate-200' },
];

interface Props {
  equipmentId: string;
  current: EquipmentStatus;
  returnTo: string;
}

export function EquipmentStatusSelect({ equipmentId, current, returnTo }: Props) {
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const currentTone = OPTIONS.find((o) => o.value === current)?.tone ?? OPTIONS[0].tone;

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as EquipmentStatus;
    if (next === current) return;
    const fd = new FormData(formRef.current!);
    fd.set('status', next);
    startTransition(() => {
      updateEquipmentStatusAction(fd);
    });
  }

  return (
    <form ref={formRef} className="relative inline-block">
      <input type="hidden" name="id" value={equipmentId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <label htmlFor={`status-${equipmentId}`} className="sr-only">
        Alterar status
      </label>
      <select
        id={`status-${equipmentId}`}
        name="status"
        defaultValue={current}
        onChange={handleChange}
        disabled={pending}
        className={`cursor-pointer appearance-none rounded-full px-3 py-0.5 pr-7 text-xs font-medium ring-1 ring-inset transition-opacity focus:outline-none focus:ring-2 focus:ring-fluxo-500 disabled:opacity-60 ${currentTone}`}
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-current opacity-60"
      >
        ▾
      </span>
    </form>
  );
}
