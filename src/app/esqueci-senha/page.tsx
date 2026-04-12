import Link from 'next/link';
import { requestPasswordResetAction } from '@/server/actions/users';

interface PageProps {
  searchParams: { enviado?: string; error?: string };
}

export default function EsqueciSenhaPage({ searchParams }: PageProps) {
  const enviado = searchParams.enviado === '1';
  const hasError = searchParams.error === 'validation';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-fluxo-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="mb-6 text-center">
          <div className="inline-block px-4 py-1 rounded-full bg-fluxo-100 text-fluxo-700 text-xs font-bold uppercase tracking-wider">
            Fluxo Suporte
          </div>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">Esqueci minha senha</h1>
          <p className="mt-1 text-sm text-slate-600">
            Informe seu email e enviaremos um link para redefinir sua senha.
          </p>
        </div>

        {enviado ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center shadow-sm">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-emerald-600 text-xl">
              ✓
            </div>
            <h2 className="text-base font-semibold text-emerald-900">Verifique seu email</h2>
            <p className="mt-2 text-sm text-emerald-800">
              Se existir uma conta ativa com esse email, enviamos um link de redefinição.
              O link é válido por <strong>1 hora</strong>.
            </p>
            <p className="mt-3 text-xs text-emerald-700">
              Não recebeu? Verifique a pasta de spam ou tente novamente em alguns minutos.
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <Link
                href="/login"
                className="rounded-md bg-fluxo-500 px-4 py-2 text-sm font-medium text-white hover:bg-fluxo-600"
              >
                Voltar ao login
              </Link>
            </div>
          </div>
        ) : (
          <form
            action={requestPasswordResetAction}
            className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4"
          >
            <div>
              <label className="block text-xs font-medium text-slate-700">Email</label>
              <input
                type="email"
                name="email"
                required
                autoFocus
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500"
                placeholder="seu@email.com"
              />
            </div>

            {hasError && (
              <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
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
              <Link href="/login" className="text-xs text-slate-500 hover:text-slate-700">
                Voltar ao login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
