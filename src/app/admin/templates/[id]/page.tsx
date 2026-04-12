import Link from 'next/link';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { updateTemplateAction } from '@/server/actions/templates';
import { notFound } from 'next/navigation';

interface PageProps {
  params: { id: string };
  searchParams: { error?: string };
}

export default async function EditTemplatePage({ params, searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user || session.user.userType !== 'AGENT') return null;

  const template = await db.responseTemplate.findUnique({ where: { id: params.id } });
  if (!template) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <Link href="/admin/templates" className="text-sm text-slate-500 hover:text-slate-700">
          ← Voltar
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Editar template</h1>
      </div>

      {searchParams.error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          Erro ao salvar. Verifique os campos.
        </div>
      )}

      <form
        action={updateTemplateAction}
        className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <input type="hidden" name="id" value={template.id} />
        <div>
          <label className="block text-xs font-medium text-slate-700">Título</label>
          <input
            name="title"
            required
            minLength={2}
            defaultValue={template.title}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700">Corpo</label>
          <textarea
            name="body"
            required
            rows={10}
            minLength={2}
            defaultValue={template.body}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name="isActive" defaultChecked={template.isActive} />
          Ativo
        </label>
        <div className="flex items-center gap-2 pt-2">
          <button
            type="submit"
            className="rounded-md bg-fluxo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-fluxo-600"
          >
            Salvar
          </button>
          <Link href="/admin/templates" className="text-sm text-slate-500 hover:text-slate-700">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
