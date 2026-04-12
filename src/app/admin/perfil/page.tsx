import { auth } from '@/lib/auth';
import { changePasswordAction } from '@/server/actions/users';

const ERROR_MESSAGES: Record<string, string> = {
  validation: 'Preencha todos os campos. A nova senha deve ter no mínimo 8 caracteres.',
  mismatch: 'A nova senha e a confirmação não coincidem.',
  wrong_password: 'Senha atual incorreta.',
};

export default async function AdminPerfilPage({
  searchParams,
}: {
  searchParams: { saved?: string; error?: string };
}) {
  const session = await auth();
  const user = session?.user as any;

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-slate-900">Meu perfil</h1>
      <p className="mt-1 text-sm text-slate-600">Informações da sua conta e troca de senha.</p>

      {/* Dados da conta */}
      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Dados da conta</h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Nome</span>
            <span className="font-medium text-slate-900">{user?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Email</span>
            <span className="font-medium text-slate-900">{user?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Perfil</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              user?.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-fluxo-100 text-fluxo-600'
            }`}>
              {user?.role === 'ADMIN' ? 'Administrador' : 'Agente'}
            </span>
          </div>
        </div>
      </div>

      {/* Troca de senha */}
      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Alterar senha</h2>

        {searchParams.saved === '1' && (
          <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-800">
            ✓ Senha alterada com sucesso.
          </div>
        )}
        {searchParams.error && ERROR_MESSAGES[searchParams.error] && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
            {ERROR_MESSAGES[searchParams.error]}
          </div>
        )}

        <form action={changePasswordAction} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Senha atual *</label>
            <input
              name="currentPassword"
              type="password"
              required
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Nova senha * (mín. 8 caracteres)</label>
            <input
              name="newPassword"
              type="password"
              required
              minLength={8}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Confirmar nova senha *</label>
            <input
              name="confirmPassword"
              type="password"
              required
              minLength={8}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-fluxo-500 focus:outline-none focus:ring-1 focus:ring-fluxo-500"
            />
          </div>
          <div>
            <button
              type="submit"
              className="rounded-md bg-fluxo-500 px-4 py-2 text-sm font-medium text-white hover:bg-fluxo-600"
            >
              Alterar senha
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
