import { Mail, User as UserIcon, KeyRound } from 'lucide-react';
import { auth } from '@/lib/auth';
import { changePasswordAction } from '@/server/actions/users';
import { SubmitButton } from '@/components/submit-button';

const ERROR_MESSAGES: Record<string, string> = {
  validation: 'Preencha todos os campos. A nova senha deve ter no mínimo 8 caracteres.',
  mismatch: 'A nova senha e a confirmação não coincidem.',
  wrong_password: 'Senha atual incorreta.',
};

export default async function PortalPerfilPage({
  searchParams,
}: {
  searchParams: { saved?: string; error?: string };
}) {
  const session = await auth();
  const user = session?.user;
  if (!user) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="micro-label-accent">Conta · cliente</p>
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
          Meu perfil
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Gerencie sua conta e altere sua senha.
        </p>
      </div>

      <section
        aria-labelledby="account-heading"
        className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-elevate dark:border-slate-700 dark:bg-slate-800"
      >
        <header className="border-b border-slate-200 px-5 py-3 dark:border-slate-700">
          <h2 id="account-heading" className="flex items-center gap-2 micro-label">
            <UserIcon className="h-3.5 w-3.5" aria-hidden="true" />
            Dados da conta
          </h2>
        </header>
        <dl className="divide-y divide-slate-100 text-sm dark:divide-slate-700">
          <div className="flex items-center justify-between px-5 py-3">
            <dt className="micro-label flex items-center gap-1.5">
              <UserIcon className="h-3 w-3" aria-hidden="true" />
              Nome
            </dt>
            <dd className="font-medium text-slate-900 dark:text-white">{user.name}</dd>
          </div>
          <div className="flex items-center justify-between px-5 py-3">
            <dt className="micro-label flex items-center gap-1.5">
              <Mail className="h-3 w-3" aria-hidden="true" />
              Email
            </dt>
            <dd className="font-mono-tech text-sm text-slate-900 dark:text-white">{user.email}</dd>
          </div>
        </dl>
      </section>

      <section
        aria-labelledby="password-heading"
        className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-elevate dark:border-slate-700 dark:bg-slate-800"
      >
        <header className="border-b border-slate-200 px-5 py-3 dark:border-slate-700">
          <h2 id="password-heading" className="flex items-center gap-2 micro-label">
            <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
            Alterar senha
          </h2>
        </header>

        <div className="p-5">
          <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
            Se você recebeu uma senha temporária por email, troque-a aqui agora.
          </p>

          {searchParams.saved === '1' && (
            <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
              ✓ Senha alterada com sucesso. Use a nova senha no próximo login.
            </div>
          )}
          {searchParams.error && ERROR_MESSAGES[searchParams.error] && (
            <div className="mb-4 rounded-md border border-rose-200 bg-rose-50/60 px-3 py-2 text-sm text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
              {ERROR_MESSAGES[searchParams.error]}
            </div>
          )}

          <form action={changePasswordAction} className="space-y-4">
            <div>
              <label htmlFor="portal-current" className="micro-label">Senha atual *</label>
              <input
                id="portal-current"
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-elevate focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500"
              />
            </div>
            <div>
              <label htmlFor="portal-new" className="micro-label">
                Nova senha * <span className="font-mono-tech normal-case tracking-normal text-slate-400">(mín. 8 caracteres)</span>
              </label>
              <input
                id="portal-new"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-elevate focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500"
              />
            </div>
            <div>
              <label htmlFor="portal-confirm" className="micro-label">Confirmar nova senha *</label>
              <input
                id="portal-confirm"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-elevate focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500"
              />
            </div>
            <div className="pt-1">
              <SubmitButton pendingText="Alterando...">Alterar senha</SubmitButton>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
