import Link from 'next/link';
import { requestPasswordResetAction } from '@/server/actions/users';

interface PageProps {
  searchParams: { enviado?: string; error?: string };
}

export default function EsqueciSenhaPage({ searchParams }: PageProps) {
  const enviado = searchParams.enviado === '1';
  const hasError = searchParams.error === 'validation';

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 20%, rgb(0 102 255 / 0.10), transparent 50%), radial-gradient(circle at 80% 80%, rgb(0 242 254 / 0.06), transparent 50%)',
        }}
      />
      <div className="relative max-w-md w-full">
        <div className="mb-6 text-center">
          <div className="inline-block px-3 py-1 rounded-full bg-fluxo-500/15 text-fluxo-700 dark:text-fluxo-300 font-mono-tech text-[10px] font-bold uppercase tracking-tech ring-1 ring-inset ring-fluxo-500/30">
            Fluxo Suporte
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold text-slate-900 dark:text-white">
            Esqueci minha senha
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Informe seu email e enviaremos um link para redefinir sua senha.
          </p>
        </div>

        {enviado ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-6 text-center shadow-elevate dark:border-emerald-900/60 dark:bg-emerald-950/30">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-emerald-500/15 text-emerald-600 text-xl ring-1 ring-inset ring-emerald-500/30 dark:text-emerald-400">
              ✓
            </div>
            <h2 className="font-display text-base font-semibold text-emerald-900 dark:text-emerald-200">
              Verifique seu email
            </h2>
            <p className="mt-2 text-sm text-emerald-800 dark:text-emerald-300">
              Se existir uma conta ativa com esse email, enviamos um link de redefinição.
              O link é válido por <strong>1 hora</strong>.
            </p>
            <p className="mt-3 text-xs text-emerald-700 dark:text-emerald-400">
              Não recebeu? Verifique a pasta de spam ou tente novamente em alguns minutos.
            </p>
            <div className="mt-5">
              <Link
                href="/login"
                className="inline-flex w-full items-center justify-center rounded-md bg-fluxo-500 px-4 py-2 text-sm font-semibold text-white shadow-fluxo hover:bg-fluxo-600"
              >
                Voltar ao login
              </Link>
            </div>
          </div>
        ) : (
          <form
            action={requestPasswordResetAction}
            className="rounded-lg border border-slate-200 bg-white p-6 shadow-elevate space-y-4 dark:border-slate-700 dark:bg-slate-800"
          >
            <div>
              <label htmlFor="forgot-email" className="micro-label">Email</label>
              <input
                id="forgot-email"
                type="email"
                name="email"
                autoComplete="email"
                required
                autoFocus
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-elevate focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500"
                placeholder="seu@email.com"
              />
            </div>

            {hasError && (
              <div className="rounded-md border border-rose-200 bg-rose-50/60 px-3 py-2 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
                Informe um email válido.
              </div>
            )}

            <button
              type="submit"
              className="w-full rounded-md bg-fluxo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-fluxo hover:bg-fluxo-600 transition"
            >
              Enviar link de redefinição
            </button>

            <div className="text-center">
              <Link href="/login" className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400">
                Voltar ao login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
