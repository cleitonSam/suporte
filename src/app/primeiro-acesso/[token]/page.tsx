import Link from 'next/link';
import { verifyPasswordToken } from '@/lib/password-token';
import { completePasswordResetAction } from '@/server/actions/users';
import { db } from '@/lib/db';

interface PageProps {
  params: { token: string };
  searchParams: { error?: string };
}

const ERROR_MSG: Record<string, string> = {
  weak: 'A senha precisa ter pelo menos 8 caracteres.',
  mismatch: 'As senhas não coincidem.',
};

export default async function PrimeiroAcessoPage({ params, searchParams }: PageProps) {
  const token = decodeURIComponent(params.token);
  const verified = await verifyPasswordToken(token);

  if (!verified) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-lg border border-slate-200 bg-white p-8 text-center shadow-elevate dark:border-slate-700 dark:bg-slate-800">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-rose-500/15 text-rose-600 ring-1 ring-inset ring-rose-500/30 dark:text-rose-400">!</div>
          <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white">
            Link inválido ou expirado
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Este link de primeiro acesso não é mais válido. Peça um novo convite ao administrador
            ou solicite um reset de senha.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Link
              href="/esqueci-senha"
              className="rounded-md bg-fluxo-500 px-4 py-2 text-sm font-semibold text-white shadow-fluxo hover:bg-fluxo-600"
            >
              Solicitar novo link
            </Link>
            <Link href="/login" className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400">
              Voltar ao login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const user = await db.user.findUnique({
    where: { id: verified.userId },
    select: { email: true, name: true },
  });

  const errorMsg = searchParams.error ? ERROR_MSG[searchParams.error] : null;
  const isInvite = verified.purpose === 'invite';

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
            {isInvite ? 'Bem-vindo!' : 'Redefinir senha'}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {isInvite
              ? 'Defina uma senha para ativar seu acesso.'
              : 'Crie uma nova senha para sua conta.'}
          </p>
          {user && (
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Conta: <span className="font-mono-tech font-medium text-slate-700 dark:text-slate-200">{user.email}</span>
            </p>
          )}
        </div>

        <form
          action={completePasswordResetAction}
          className="rounded-lg border border-slate-200 bg-white p-6 shadow-elevate space-y-4 dark:border-slate-700 dark:bg-slate-800"
        >
          <input type="hidden" name="token" value={token} />

          <div>
            <label htmlFor="invite-new" className="micro-label">Nova senha</label>
            <input
              id="invite-new"
              type="password"
              name="newPassword"
              autoComplete="new-password"
              required
              minLength={8}
              autoFocus
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-elevate focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500"
              placeholder="Mínimo 8 caracteres"
            />
          </div>

          <div>
            <label htmlFor="invite-confirm" className="micro-label">Confirme a senha</label>
            <input
              id="invite-confirm"
              type="password"
              name="confirmPassword"
              autoComplete="new-password"
              required
              minLength={8}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-elevate focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500"
            />
          </div>

          {errorMsg && (
            <div className="rounded-md border border-rose-200 bg-rose-50/60 px-3 py-2 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            className="w-full rounded-md bg-fluxo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-fluxo hover:bg-fluxo-600 transition"
          >
            Salvar senha
          </button>

          <p className="text-center text-xs text-slate-400 dark:text-slate-500">
            Após salvar você será redirecionado para o login.
          </p>
        </form>
      </div>
    </div>
  );
}
