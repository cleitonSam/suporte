import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { createTicketAction } from '@/server/actions/tickets';

export default async function NovoChamadoPage() {
  const session = await auth();
  const user = session?.user as any;

  const [categories, equipments] = await Promise.all([
    db.ticketCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    }),
    user?.clientId
      ? db.equipment.findMany({
          where: { clientId: user.clientId, deletedAt: null, status: 'ACTIVE' },
          orderBy: { name: 'asc' },
          select: { id: true, name: true },
        })
      : [],
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Abrir novo chamado</h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Descreva o problema com o máximo de detalhes possível para agilizar o atendimento.
      </p>

      <form
        action={async (formData) => {
          'use server';
          await createTicketAction(formData);
        }}
        className="mt-6 space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-elevate dark:border-slate-700 dark:bg-slate-800"
      >
        <div>
          <label htmlFor="portal-ticket-title" className="block text-sm font-medium text-slate-700">Título *</label>
          <input
            id="portal-ticket-title"
            name="title"
            required
            minLength={5}
            maxLength={200}
            placeholder="Ex: Impressora não imprime desde manhã"
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-elevate focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500"
          />
        </div>

        <div>
          <label htmlFor="portal-ticket-description" className="block text-sm font-medium text-slate-700">Descrição *</label>
          <textarea
            id="portal-ticket-description"
            name="description"
            required
            minLength={10}
            rows={6}
            placeholder="O que está acontecendo? Quando começou? O que já tentou?"
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-elevate focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="portal-ticket-priority" className="block text-sm font-medium text-slate-700">Prioridade</label>
            <select
              id="portal-ticket-priority"
              name="priority"
              defaultValue="MEDIUM"
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-elevate focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500"
            >
              <option value="LOW">Baixa</option>
              <option value="MEDIUM">Média</option>
              <option value="HIGH">Alta</option>
              <option value="URGENT">Urgente</option>
            </select>
          </div>

          <div>
            <label htmlFor="portal-ticket-category" className="block text-sm font-medium text-slate-700">Categoria</label>
            <select
              id="portal-ticket-category"
              name="categoryId"
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-elevate focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500"
            >
              <option value="">— Selecione —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {equipments.length > 0 && (
          <div>
            <label htmlFor="portal-ticket-equipment" className="block text-sm font-medium text-slate-700">
              Equipamento relacionado
            </label>
            <select
              id="portal-ticket-equipment"
              name="equipmentId"
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-elevate focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500"
            >
              <option value="">— Nenhum —</option>
              {equipments.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="submit"
            className="rounded-md bg-fluxo-500 px-4 py-2 text-sm font-medium text-white shadow-elevate hover:bg-fluxo-600"
          >
            Abrir chamado
          </button>
        </div>
      </form>
    </div>
  );
}
