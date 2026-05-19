import Link from 'next/link';
import { SubmitButton } from '@/components/submit-button';

interface Category {
  id: string;
  name: string;
}

interface EquipmentDefaults {
  id?: string;
  name?: string | null;
  categoryId?: string | null;
  status?: string | null;
  brand?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  patrimony?: string | null;
  ipAddress?: string | null;
  macAddress?: string | null;
  location?: string | null;
  purchaseDate?: Date | string | null;
  warrantyExpiresAt?: Date | string | null;
  notes?: string | null;
}

interface Props {
  action: (formData: FormData) => void | Promise<void>;
  clientId: string;
  categories: Category[];
  defaults?: EquipmentDefaults;
  cancelHref: string;
  submitLabel?: string;
  pendingLabel?: string;
}

function dateInputValue(d: Date | string | null | undefined): string {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

export function EquipmentForm({
  action,
  clientId,
  categories,
  defaults,
  cancelHref,
  submitLabel = 'Salvar equipamento',
  pendingLabel = 'Salvando...',
}: Props) {
  const v = defaults ?? {};
  const inputClass =
    'mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500';
  const monoClass = `${inputClass} font-mono`;
  const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-200';

  return (
    <form action={action} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <input type="hidden" name="clientId" value={clientId} />
      {v.id && <input type="hidden" name="id" value={v.id} />}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label htmlFor="eq-name" className={labelClass}>Nome / Identificação *</label>
          <input
            id="eq-name"
            name="name"
            required
            defaultValue={v.name ?? ''}
            placeholder="Ex: CPU do João — Recepção, Switch 24 portas — Sala TI"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="eq-category" className={labelClass}>Categoria *</label>
          <select id="eq-category" name="categoryId" required defaultValue={v.categoryId ?? ''} className={inputClass}>
            <option value="">— Selecione —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="eq-status" className={labelClass}>Status</label>
          <select id="eq-status" name="status" defaultValue={v.status ?? 'ACTIVE'} className={inputClass}>
            <option value="ACTIVE">Ativo</option>
            <option value="IN_REPAIR">Em reparo</option>
            <option value="RETIRED">Desativado</option>
          </select>
        </div>

        <div>
          <label htmlFor="eq-brand" className={labelClass}>Marca / Fabricante</label>
          <input id="eq-brand" name="brand" defaultValue={v.brand ?? ''} placeholder="Dell, HP, Lenovo..." className={inputClass} />
        </div>

        <div>
          <label htmlFor="eq-model" className={labelClass}>Modelo</label>
          <input id="eq-model" name="model" defaultValue={v.model ?? ''} placeholder="OptiPlex 7090, ThinkPad E14..." className={inputClass} />
        </div>

        <div>
          <label htmlFor="eq-serial" className={labelClass}>Número de série (S/N)</label>
          <input id="eq-serial" name="serialNumber" defaultValue={v.serialNumber ?? ''} placeholder="ABC123XYZ" className={monoClass} />
        </div>

        <div>
          <label htmlFor="eq-patrimony" className={labelClass}>Patrimônio / Tombamento</label>
          <input id="eq-patrimony" name="patrimony" defaultValue={v.patrimony ?? ''} placeholder="PAT-0042" className={monoClass} />
        </div>

        <div>
          <label htmlFor="eq-ip" className={labelClass}>Endereço IP</label>
          <input id="eq-ip" name="ipAddress" defaultValue={v.ipAddress ?? ''} placeholder="192.168.1.100" className={monoClass} />
        </div>

        <div>
          <label htmlFor="eq-mac" className={labelClass}>MAC Address</label>
          <input id="eq-mac" name="macAddress" defaultValue={v.macAddress ?? ''} placeholder="AA:BB:CC:DD:EE:FF" className={monoClass} />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="eq-location" className={labelClass}>Localização física</label>
          <input
            id="eq-location"
            name="location"
            defaultValue={v.location ?? ''}
            placeholder="Sala 2 — 1º andar, Mesa do João, Rack principal..."
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="eq-purchase" className={labelClass}>Data de compra</label>
          <input
            id="eq-purchase"
            name="purchaseDate"
            type="date"
            defaultValue={dateInputValue(v.purchaseDate)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="eq-warranty" className={labelClass}>Garantia até</label>
          <input
            id="eq-warranty"
            name="warrantyExpiresAt"
            type="date"
            defaultValue={dateInputValue(v.warrantyExpiresAt)}
            className={inputClass}
          />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="eq-notes" className={labelClass}>Observações</label>
          <textarea
            id="eq-notes"
            name="notes"
            rows={3}
            defaultValue={v.notes ?? ''}
            placeholder="Configurações especiais, histórico de manutenção, senha local, etc."
            className={inputClass}
          />
        </div>
      </div>

      <div className="mt-6 flex gap-2">
        <SubmitButton pendingText={pendingLabel}>{submitLabel}</SubmitButton>
        <Link
          href={cancelHref}
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
