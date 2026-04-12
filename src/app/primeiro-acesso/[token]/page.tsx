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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-rose-100 text-rose-600">!</div>
          <h1 className="text-xl font-bold text-slate-900">Link inválido ou expirado</h1>
          <p className="mt-2 text-sm text-slate-600">
            Este link de primeiro acesso não é mais válido. Peça um novo convite ao administrador
            ou solicite um reset de senha.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Link
              href="/esqueci-senha"
              className="rounded-md bg-fluxo-500 px-4 py-2 text-sm font-medium text-white hover:bg-fluxo-600"
            >
              Solicitar novo link
            </Link>
            <Link href="/login" className="text-sm text-slate-500 hover:text-slate-700">
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-fluxo-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="mb-6 text-center">
          <div className="inline-block px-4 py-1 rounded-full bg-fluxo-100 text-fluxo-700 text-xs font-bold uppercase tracking-wider">
            Fluxo Suporte
          </div>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">
            {isInvite ? 'Bem-vindo!' : 'Redefinir senha'}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {isInvite
              ? 'Defina uma senha para ativar seu acesso.'
              : 'Crie uma nova senha para sua conta.'}
          </p>
          {user && (
            <p className="mt-2 text-xs text-slate-500">
              Conta: <span className="font-medium text-slate-700">{user.email}</span>
            </p>
          )}
        </div>

        <form
          action={completePasswordResetAction}
          className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4"
        >
          <input type="hidden" name="token" value={token} />

          <div>
            <label className="block text-xs font-medium text-slate-700">Nova senha</label>
            <input
              type="password"
              name="newPassword"
              required
              minLength={8}
              autoFocus
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500"
              placeholder="Mínimo 8 caracteres"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">Confirme a senha</label>
            <input
              type="password"
              name="confirmPassword"
              required
              minLength={8}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500"
            />
          </div>

          {errorMsg && (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            className="w-full rounded-md bg-fluxo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-fluxo hover:bg-fluxo-600 transition"
          >
            Salvar senha
          </button>

          <p className="text-center text-xs text-slate-400">
            Após salvar você será redirecionado para o login.
          </p>
        </form>
      </div>
    </div>
  );
}
