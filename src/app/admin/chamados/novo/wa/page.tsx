import Link from 'next/link';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { createTicketByAgentAction } from '@/server/actions/ticket-admin';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: {
    title?: string;
    text?: string;
    url?: string;
  };
}

/**
 * Extrai numero de telefone brasileiro (com ou sem DDD/DDI) de um texto.
 * Casos suportados: +55 11 99999-1234, 11999991234, (11) 99999-1234.
 * Retorna numero so com digitos (sem o '+').
 */
function extractPhone(text: string): string | null {
  const cleaned = text.replace(/\s+/g, ' ');
  // Tenta varios formatos. Pega o primeiro match.
  const patterns = [
    /\+?55\s?\(?(\d{2})\)?\s?9?\s?(\d{4})[\s-]?(\d{4})/,
    /\(?(\d{2})\)?\s?9?\s?(\d{4})[\s-]?(\d{4})/,
  ];
  for (const p of patterns) {
    const m = cleaned.match(p);
    if (m) {
      const ddd = m[1];
      const part1 = m[2];
      const part2 = m[3];
      return `55${ddd}${part1.length === 4 ? '9' : ''}${part1}${part2}`.replace(/\D/g, '');
    }
  }
  return null;
}

/**
 * Limpa numero pra comparar com User.phone (que pode ter formatos diferentes).
 */
function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, '').replace(/^55/, '');
}

export default async function NovoChamadoWhatsAppPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user || session.user.userType !== 'AGENT') {
    return null;
  }

  // Share target Android manda text + title + url. WhatsApp tipicamente
  // manda title vazio ou nome do contato + text com o conteudo.
  const sharedText = (searchParams.text ?? '').trim();
  const sharedTitle = (searchParams.title ?? '').trim();
  const sharedUrl = (searchParams.url ?? '').trim();

  // Combina texto pra busca de telefone
  const haystack = `${sharedTitle} ${sharedText}`.trim();
  const phone = haystack ? extractPhone(haystack) : null;

  // Sugere cliente pelo telefone do contato
  let suggestedClient: { id: string; name: string; contactName: string } | null = null;
  if (phone) {
    const phoneNorm = normalizePhone(phone);
    if (phoneNorm.length >= 8) {
      // Busca por User cujo phone "contenha" o nosso (pra tolerar formatos)
      const candidates = await db.user.findMany({
        where: {
          userType: 'CLIENT_CONTACT',
          isActive: true,
          deletedAt: null,
          phone: { not: null },
          clientId: { not: null },
        },
        select: { id: true, name: true, phone: true, clientId: true, client: { select: { name: true } } },
        take: 200,
      });
      const tail8 = phoneNorm.slice(-8);
      const hit = candidates.find((u) => {
        if (!u.phone) return false;
        const userPhone = normalizePhone(u.phone);
        return userPhone.endsWith(tail8);
      });
      if (hit && hit.clientId && hit.client) {
        suggestedClient = {
          id: hit.clientId,
          name: hit.client.name,
          contactName: hit.name,
        };
      }
    }
  }

  const [clients, categories, queues] = await Promise.all([
    db.client.findMany({
      where: { deletedAt: null, status: 'ACTIVE' },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
    db.ticketCategory.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } }),
    db.queue.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' }, select: { id: true, name: true } }),
  ]);

  // Monta título e descrição sugeridos a partir do conteúdo compartilhado
  const firstLine = sharedText.split('\n')[0]?.trim() ?? '';
  const defaultTitle =
    sharedTitle && sharedTitle.length < 80
      ? sharedTitle
      : firstLine.length > 0 && firstLine.length < 120
      ? firstLine
      : '';

  const defaultDescription = [
    sharedText || '',
    sharedUrl ? `\n\nLink original: ${sharedUrl}` : '',
    phone ? `\n\n(Telefone detectado: ${phone})` : '',
  ]
    .join('')
    .trim();

  return (
    <div className="mx-auto max-w-2xl">
      {/* Breadcrumb */}
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
        <Link href="/admin/chamados" className="inline-flex items-center gap-1 hover:text-fluxo-500">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Chamados
        </Link>
        <span aria-hidden="true">/</span>
        <span className="font-medium text-slate-900 dark:text-white">Abrir de WhatsApp</span>
      </div>

      {/* Hero */}
      <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50/60 p-5 dark:border-emerald-900/60 dark:bg-emerald-950/30">
        <div className="flex items-start gap-3">
          <MessageSquare className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Cliente mandou no WhatsApp?
            </h1>
            <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
              Cole aqui (ou compartilhe direto do app no celular) e abra o chamado em 5 segundos.
              {suggestedClient && (
                <>
                  {' '}<strong className="text-emerald-700 dark:text-emerald-400">
                    Cliente <em>{suggestedClient.name}</em> detectado pelo telefone do contato{' '}
                    <em>{suggestedClient.contactName}</em>.
                  </strong>
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      <form
        action={createTicketByAgentAction}
        className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-elevate dark:border-slate-700 dark:bg-slate-800"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label htmlFor="wa-title" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Título *
            </label>
            <input
              id="wa-title"
              name="title"
              required
              minLength={5}
              maxLength={200}
              defaultValue={defaultTitle}
              placeholder="Ex: Internet caiu no escritório"
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-elevate focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500"
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="wa-description" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Descrição *
            </label>
            <textarea
              id="wa-description"
              name="description"
              required
              minLength={10}
              rows={8}
              defaultValue={defaultDescription}
              placeholder="Cole aqui o texto do WhatsApp ou descreva o problema"
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-elevate focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Dica: você pode colar a conversa inteira. O título vira o primeiro parágrafo.
            </p>
          </div>

          <div>
            <label htmlFor="wa-client" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Cliente *
            </label>
            <select
              id="wa-client"
              name="clientId"
              required
              defaultValue={suggestedClient?.id ?? ''}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-elevate focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500"
            >
              <option value="">— Selecione o cliente —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {suggestedClient && (
              <p className="mt-1 text-[11px] text-emerald-700 dark:text-emerald-400">
                ✓ Sugerido pelo telefone detectado
              </p>
            )}
          </div>

          <div>
            <label htmlFor="wa-priority" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Prioridade
            </label>
            <select
              id="wa-priority"
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
            <label htmlFor="wa-category" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Categoria
            </label>
            <select
              id="wa-category"
              name="categoryId"
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-elevate focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500"
            >
              <option value="">— Nenhuma —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="wa-queue" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Fila
            </label>
            <select
              id="wa-queue"
              name="queueId"
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-elevate focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500"
            >
              <option value="">— Padrão (Geral) —</option>
              {queues.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="submit"
            className="rounded-md bg-fluxo-500 px-4 py-2 text-sm font-semibold text-white shadow-fluxo hover:bg-fluxo-600"
          >
            Abrir chamado
          </button>
          <Link
            href="/admin/chamados"
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
          >
            Cancelar
          </Link>
        </div>
      </form>

      {/* Onboarding "como usar" */}
      <details className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs dark:border-slate-700 dark:bg-slate-900">
        <summary className="cursor-pointer font-semibold text-slate-700 dark:text-slate-200">
          Como compartilhar do WhatsApp pra cá (Android)
        </summary>
        <ol className="mt-3 space-y-1 list-decimal pl-5 text-slate-600 dark:text-slate-400">
          <li>Instale o Fluxo como app (banner "Instalar" no celular, ou Chrome → menu → "Adicionar à tela inicial").</li>
          <li>No WhatsApp, segure a mensagem (ou várias) → Compartilhar.</li>
          <li>Escolha <strong>Fluxo Suporte</strong> na lista de apps.</li>
          <li>Cai direto aqui com o texto colado. Confirma cliente e prioridade e manda.</li>
        </ol>
        <p className="mt-3 text-slate-500">
          No desktop, basta abrir esta URL e colar o texto manualmente.
        </p>
      </details>
    </div>
  );
}
