import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { createEquipmentAction } from '@/server/actions/equipment';

export default async function NovoEquipamentoPage({ params }: { params: { id: string } }) {
  const [client, categories] = await Promise.all([
    db.client.findFirst({
      where: { id: params.id, deletedAt: null },
      select: { id: true, name: true },
    }),
    db.equipmentCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    }),
  ]);

  if (!client) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center gap-2 text-sm text-slate-600">
        <Link href="/admin/clientes" className="hover:text-fluxo-500">Clientes</Link>
        <span>/</span>
        <Link href={`/admin/clientes/${client.id}?aba=equipamentos`} className="hover:text-fluxo-500">{client.name}</Link>
        <span>/</span>
        <span className="font-medium text-slate-900">Novo equipamento</span>
      </div>

      <h1 className="text-2xl font-bold text-slate-900">Novo equipamento</h1>
      <p className="mt-1 text-sm text-slate-600">
        Cadastro de ativo de TI para <strong>{client.name}</strong>.
      </p>

      <form
        action={createEquipmentAction}
        className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        <input type="hidden" name="clientId" value={client.id} />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Nome e categoria */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700">Nome / Identificação *</label>
            <input
              name="name" required
              placeholder="Ex: CPU do João – Recepcão, Switch 24 portas – Sala TI"
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Categoria *</label>
            <select
              name="categoryId" required
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500"
            >
              <option value="">— Selecione —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Status</label>
            <select
              name="status" defaultValue="ACTIVE"
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500"
            >
              <option value="ACTIVE">Ativo</option>
              <option value="IN_REPAIR">Em reparo</option>
              <option value="RETIRED">Desativado</option>
            </select>
          </div>

          {/* Fabricante / modelo */}
          <div>
            <label className="block text-sm font-medium text-slate-700">Marca / Fabricante</label>
            <input
              name="brand"
              placeholder="Dell, HP, Lenovo..."
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Modelo</label>
            <input
              name="model"
              placeholder="OptiPlex 7090, ThinkPad E14..."
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500"
            />
          </div>

          {/* Identificadores */}
          <div>
            <label className="block text-sm font-medium text-slate-700">Número de série (S/N)</label>
            <input
              name="serialNumber"
              placeholder="ABC123XYZ"
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono shadow-sm focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Patrimônio / Tombamento</label>
            <input
              name="patrimony"
              placeholder="PAT-0042"
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono shadow-sm focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500"
            />
          </div>

          {/* Rede */}
          <div>
            <label className="block text-sm font-medium text-slate-700">Endereço IP</label>
            <input
              name="ipAddress"
              placeholder="192.168.1.100"
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono shadow-sm focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">MAC Address</label>
            <input
              name="macAddress"
              placeholder="AA:BB:CC:DD:EE:FF"
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono shadow-sm focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500"
            />
          </div>

          {/* Localização e datas */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700">Localização física</label>
            <input
              name="location"
              placeholder="Sala 2 – 1º andar, Mesa do João, Rack principal..."
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Data de compra</label>
            <input
              name="purchaseDate" type="date"
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Garantia até</label>
            <input
              name="warrantyExpiresAt" type="date"
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700">Observações</label>
            <textarea
              name="notes" rows={3}
              placeholder="Configurações especiais, histórico de manutenção, senha local, etc."
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500"
            />
          </div>
        </div>

        <div className="mt-6 flex gap-2">
          <button
            type="submit"
            className="rounded-md bg-fluxo-500 px-4 py-2 text-sm font-medium text-white hover:bg-fluxo-600"
          >
            Salvar equipamento
          </button>
          <Link
            href={`/admin/clientes/${client.id}?aba=equipamentos`}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
