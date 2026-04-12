import { signIn } from '@/lib/auth';
import { AuthError } from 'next-auth';
import { redirect } from 'next/navigation';
import { HeadphonesIcon, Shield, Zap, Clock } from 'lucide-react';

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  async function login(formData: FormData) {
    'use server';
    try {
      await signIn('credentials', {
        email: formData.get('email'),
        password: formData.get('password'),
        redirectTo: '/',
      });
    } catch (err) {
      if (err instanceof AuthError) {
        redirect('/login?error=CredentialsSignin');
      }
      throw err;
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Hero lateral */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-fluxo-gradient-dark p-12 lg:flex lg:w-1/2">
        {/* Glows decorativos */}
        <div className="absolute -left-20 -top-20 h-96 w-96 rounded-full bg-fluxo-500/20 blur-3xl" />
        <div className="absolute -bottom-24 -right-16 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-fluxo-gradient shadow-fluxo-lg">
            <HeadphonesIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="font-display text-lg font-bold text-white">Fluxo Suporte</div>
            <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-cyan-400">
              Digital Tech
            </div>
          </div>
        </div>

        {/* Tagline */}
        <div className="relative space-y-6">
          <h1 className="font-display text-4xl font-bold leading-tight text-white">
            Suporte de TI no ritmo
            <br />
            do seu <span className="text-cyan-400">negócio</span>.
          </h1>
          <p className="max-w-md text-sm leading-relaxed text-slate-300">
            Portal unificado da Fluxo Digital Tech para abertura, acompanhamento e resolução
            de chamados de suporte técnico. Rápido, transparente e sempre disponível.
          </p>

          <div className="grid grid-cols-3 gap-6 pt-4">
            <Feature icon={Shield} title="Seguro" desc="Dados protegidos e auditados" />
            <Feature icon={Zap} title="Ágil" desc="Respostas em tempo recorde" />
            <Feature icon={Clock} title="Operação 24/7" desc="Portal disponível a qualquer momento" />
          </div>
        </div>

        {/* Rodapé hero */}
        <div className="relative text-xs text-slate-400">
          © {new Date().getFullYear()} Fluxo Digital Tech · Todos os direitos reservados
        </div>
      </div>

      {/* Form direito */}
      <div className="flex w-full items-center justify-center bg-slate-50 px-4 py-12 dark:bg-slate-950 lg:w-1/2">
        <div className="w-full max-w-sm">
          {/* Logo mobile */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-fluxo-gradient shadow-fluxo">
              <HeadphonesIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="font-display text-base font-bold text-slate-900 dark:text-white">Fluxo Suporte</div>
              <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-fluxo-600 dark:text-cyan-400">
                Digital Tech
              </div>
            </div>
          </div>

          <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Entrar na plataforma</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Acesse com seu email corporativo.
          </p>

          {searchParams.error === 'CredentialsSignin' && (
            <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-500/10 dark:text-red-400">
              Email ou senha inválidos.
            </div>
          )}

          <form action={login} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Email
              </label>
              <input
                name="email"
                type="email"
                required
                placeholder="voce@empresa.com.br"
                className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-fluxo-500 focus:outline-none focus:ring-2 focus:ring-fluxo-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Senha
              </label>
              <input
                name="password"
                type="password"
                required
                placeholder="••••••••"
                className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-fluxo-500 focus:outline-none focus:ring-2 focus:ring-fluxo-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-md bg-fluxo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-fluxo transition hover:bg-fluxo-600"
            >
              Entrar
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
            Não tem acesso? Solicite ao seu gestor de TI.
          </p>
        </div>
      </div>
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  desc,
}: {
  icon: any;
  title: string;
  desc: string;
}) {
  return (
    <div>
      <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/20">
        <Icon className="h-4 w-4 text-cyan-400" />
      </div>
      <div className="text-xs font-semibold text-white">{title}</div>
      <div className="text-[11px] text-slate-400">{desc}</div>
    </div>
  );
}
