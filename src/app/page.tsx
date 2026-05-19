import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  HeadphonesIcon,
  Ticket,
  ShieldCheck,
  Monitor,
  Zap,
  BookOpen,
  TrendingUp,
  CheckCircle2,
  ArrowRight,
  Building2,
  Smile,
  Activity,
} from 'lucide-react';
import { auth } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Fluxo Suporte — Helpdesk pro provedor de TI brasileiro',
  description:
    'Plataforma de chamados, inventário, SLA, automação e CSAT pra MSPs. Pare de atender no WhatsApp.',
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Fluxo Suporte',
    description: 'Helpdesk operacional pro provedor de TI brasileiro',
    type: 'website',
    locale: 'pt_BR',
  },
};

export default async function LandingPage() {
  const session = await auth();

  // Redireciona quem já está logado
  if (session?.user) {
    if (session.user.userType === 'AGENT') redirect('/admin');
    redirect('/portal');
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* Background decorativo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(circle at 15% 20%, rgb(0 102 255 / 0.15), transparent 50%), radial-gradient(circle at 85% 10%, rgb(0 242 254 / 0.08), transparent 45%), radial-gradient(circle at center, rgb(148 163 184 / 0.05) 1px, transparent 1px)',
          backgroundSize: 'auto, auto, 24px 24px',
        }}
      />

      {/* NAV */}
      <header className="relative border-b border-slate-900 bg-slate-950/60 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-md bg-fluxo-gradient shadow-fluxo">
              <HeadphonesIcon className="h-4 w-4 text-white" aria-hidden="true" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-display text-sm font-bold tracking-tight text-white">
                Fluxo Suporte
              </span>
              <span className="font-mono-tech text-[9px] uppercase tracking-tech text-cyan-400/80">
                [ tech.ops ]
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-md border border-slate-800 bg-slate-900/60 px-4 py-1.5 text-sm font-medium text-slate-200 transition-colors hover:border-fluxo-500 hover:text-white"
            >
              Entrar
            </Link>
            <Link
              href="/login"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-md bg-fluxo-500 px-4 py-1.5 text-sm font-semibold text-white shadow-fluxo transition hover:bg-fluxo-600"
            >
              Acessar plataforma
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-fluxo-500/30 bg-fluxo-500/10 px-3 py-1 font-mono-tech text-[10px] font-semibold uppercase tracking-tech text-fluxo-300">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              Operacional · helpdesk pro MSP brasileiro
            </div>

            <h1 className="mt-6 font-display text-4xl font-bold leading-tight text-white sm:text-5xl md:text-6xl">
              Pare de atender chamados de TI{' '}
              <span className="bg-fluxo-gradient bg-clip-text text-transparent">
                no WhatsApp.
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-300 sm:text-xl">
              Fluxo Suporte é a plataforma operacional pra provedores de TI brasileiros que querem
              entregar atendimento com{' '}
              <strong className="text-white">SLA visível</strong>,{' '}
              <strong className="text-white">inventário sob controle</strong> e{' '}
              <strong className="text-white">acesso remoto integrado</strong>.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/login"
                className="group inline-flex w-full items-center justify-center gap-2 rounded-md bg-fluxo-500 px-6 py-3 text-sm font-semibold text-white shadow-fluxo-lg transition hover:bg-fluxo-600 sm:w-auto"
              >
                Acessar a plataforma
                <ArrowRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Link>
              <a
                href="#features"
                className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-slate-800 bg-slate-900/40 px-6 py-3 text-sm font-medium text-slate-200 transition-colors hover:border-fluxo-500/50 hover:text-white sm:w-auto"
              >
                Ver recursos
              </a>
            </div>

            <p className="mt-8 font-mono-tech text-[11px] uppercase tracking-tech text-slate-500">
              construído por agentes de TI · pra agentes de TI
            </p>
          </div>

          {/* Stats strip */}
          <div className="mx-auto mt-16 grid max-w-3xl grid-cols-3 gap-px overflow-hidden rounded-lg border border-slate-800 bg-slate-800/40">
            <StatTile value="100%" label="pt-BR + LGPD" />
            <StatTile value="0" label="taxa por chamado" />
            <StatTile value="∞" label="usuários por cliente" />
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="relative border-t border-slate-900 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-mono-tech text-[11px] font-semibold uppercase tracking-tech text-cyan-400">
              [ plataforma ]
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold text-white sm:text-4xl">
              Tudo que o MSP precisa em <span className="text-fluxo-400">um lugar</span>
            </h2>
            <p className="mt-3 text-slate-400">
              Tickets, inventário, SLA, automação, base de conhecimento e CSAT —
              num único portal pro seu cliente e seu time.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={<Ticket className="h-5 w-5" />}
              title="Chamados com SLA visível"
              description="Cliente abre, acompanha e vê o prazo. Você prioriza por urgência e tempo restante. Reabertura, transferências e atribuições rastreadas."
            />
            <FeatureCard
              icon={<Monitor className="h-5 w-5" />}
              title="Inventário + garantia"
              description="Cada cliente tem seu parque: CPUs, servidores, switches, impressoras. Alertas de garantia vencendo, histórico de chamados por equipamento."
            />
            <FeatureCard
              icon={<Activity className="h-5 w-5" />}
              title="Acesso remoto integrado"
              description="RustDesk plugado direto no chamado: 1-click pra abrir sessão. Sem precisar AnyDesk separado, sem cobrar à parte."
            />
            <FeatureCard
              icon={<Zap className="h-5 w-5" />}
              title="Automação por regras"
              description="Auto-atribuição por categoria, escalation em SLA vencendo, notificações em casos críticos. Engine JSON sem precisar low-code visual."
            />
            <FeatureCard
              icon={<BookOpen className="h-5 w-5" />}
              title="Base de conhecimento"
              description="Artigos visíveis pro cliente final. Reduz chamados repetidos. Categorias, busca, vote útil/não-útil."
            />
            <FeatureCard
              icon={<Smile className="h-5 w-5" />}
              title="CSAT + NPS automático"
              description="Pesquisa de satisfação enviada após cada resolução. Dashboard com tendência, top atendentes e comentários. Use pra renovar contrato."
            />
            <FeatureCard
              icon={<ShieldCheck className="h-5 w-5" />}
              title="Audit log completo"
              description="Trilha de TODA ação do sistema: login, mudanças, exclusões. Compliance pronto pra clientes enterprise."
            />
            <FeatureCard
              icon={<TrendingUp className="h-5 w-5" />}
              title="Relatórios PDF brandeados"
              description="Chamados do mês, desempenho da equipe, carteira de clientes. Em PDF com sua identidade visual, prontos pra mandar."
            />
            <FeatureCard
              icon={<Building2 className="h-5 w-5" />}
              title="Multi-cliente nativo"
              description="Carteira ilimitada de empresas atendidas. Status (ativo/suspenso/inativo), CNPJ validado, contatos por cliente."
            />
          </div>
        </div>
      </section>

      {/* DIFFERENTIATOR */}
      <section className="relative border-t border-slate-900 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="font-mono-tech text-[11px] font-semibold uppercase tracking-tech text-cyan-400">
                [ feito pro MSP ]
              </p>
              <h2 className="mt-3 font-display text-3xl font-bold text-white sm:text-4xl">
                Generalistas atendem TODO MUNDO.
                <br />
                <span className="text-fluxo-400">A gente atende você.</span>
              </h2>
              <p className="mt-4 text-slate-400">
                Movidesk, Zendesk, Octadesk foram feitos pra suporte interno de empresas grandes.
                Você é provedor: precisa de inventário por cliente, acesso remoto built-in,
                relatório mensal pra prestação de contas. Tudo isso é first-class no Fluxo.
              </p>
              <div className="mt-8 space-y-3">
                <CheckRow text="Inventário com garantia tracking nativo (raro em concorrentes)" />
                <CheckRow text="RustDesk built-in pra acesso remoto sem integração externa" />
                <CheckRow text="Pt-BR + CNPJ + LGPD desde o dia 1" />
                <CheckRow text="Sem cobrar por contato cadastrado ou ticket extra" />
                <CheckRow text="Audit log e CSAT já no produto, sem add-on" />
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-fluxo-500/20 via-transparent to-cyan-500/10 blur-3xl" />
              <div className="relative rounded-xl border border-slate-800 bg-slate-900/60 p-8 backdrop-blur">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-4">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <span className="ml-2 font-mono-tech text-[10px] text-slate-500">
                    suporte.fluxodigitaltech.com.br
                  </span>
                </div>
                <div className="mt-4 space-y-3">
                  <div className="rounded-md border border-slate-800 bg-slate-950/60 p-3">
                    <p className="font-mono-tech text-[10px] text-slate-500">CH-2026-00142</p>
                    <p className="mt-1 text-sm font-medium text-slate-100">
                      Impressora não imprime desde manhã
                    </p>
                    <div className="mt-2 flex items-center gap-3 text-[11px]">
                      <span className="inline-flex items-center gap-1.5 text-amber-300">
                        <span className="h-2 w-2 rounded-full bg-amber-400 ring-2 ring-inset ring-amber-400/30" />
                        Em andamento
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-orange-300">
                        <span className="h-2 w-2 rounded-full bg-orange-400 ring-2 ring-inset ring-orange-400/30" />
                        Alta
                      </span>
                      <span className="font-mono-tech text-slate-500">há 12 min</span>
                    </div>
                  </div>
                  <div className="rounded-md border border-slate-800 bg-slate-950/60 p-3">
                    <p className="font-mono-tech text-[10px] text-slate-500">CH-2026-00141</p>
                    <p className="mt-1 text-sm font-medium text-slate-100">
                      Configurar VPN no notebook do João
                    </p>
                    <div className="mt-2 flex items-center gap-3 text-[11px]">
                      <span className="inline-flex items-center gap-1.5 text-emerald-300">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-inset ring-emerald-400/30" />
                        Resolvido
                      </span>
                      <span className="font-mono-tech text-slate-500">há 1h</span>
                    </div>
                  </div>
                  <div className="rounded-md border border-fluxo-500/30 bg-fluxo-500/10 p-3">
                    <p className="font-mono-tech text-[10px] text-fluxo-300">CH-2026-00140</p>
                    <p className="mt-1 text-sm font-medium text-white">
                      Servidor caiu — produção parada
                    </p>
                    <div className="mt-2 flex items-center gap-3 text-[11px]">
                      <span className="inline-flex items-center gap-1.5 text-rose-300">
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-60" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-400 ring-2 ring-inset ring-rose-400/30" />
                        </span>
                        Urgente
                      </span>
                      <span className="font-mono-tech text-rose-300">SLA estourado +18min</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="relative border-t border-slate-900 py-24">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">
            Bora parar de fazer suporte na <span className="text-fluxo-400">unha</span>?
          </h2>
          <p className="mt-4 text-slate-400">
            Acesse a plataforma agora. Se você não tem conta, fala com seu administrador
            ou com a Fluxo Digital Tech.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-fluxo-500 px-6 py-3 text-sm font-semibold text-white shadow-fluxo-lg hover:bg-fluxo-600 sm:w-auto"
            >
              Entrar agora
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <a
              href="mailto:ti@fluxodigitaltech.com.br"
              className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-slate-800 bg-slate-900/40 px-6 py-3 text-sm font-medium text-slate-200 hover:border-fluxo-500/50 hover:text-white sm:w-auto"
            >
              Falar com a Fluxo
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative border-t border-slate-900 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-fluxo-gradient">
              <HeadphonesIcon className="h-3.5 w-3.5 text-white" aria-hidden="true" />
            </div>
            <span className="text-sm font-medium text-slate-300">Fluxo Digital Tech</span>
          </div>
          <p className="font-mono-tech text-[10px] uppercase tracking-tech text-slate-600">
            © {new Date().getFullYear()} Fluxo Digital Tech · ti@fluxodigitaltech.com.br
          </p>
        </div>
      </footer>
    </main>
  );
}

function StatTile({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-slate-950 px-6 py-5 text-center">
      <div className="font-display text-2xl font-bold text-white sm:text-3xl">{value}</div>
      <div className="mt-1 font-mono-tech text-[10px] uppercase tracking-tech text-slate-400">
        {label}
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-lg border border-slate-800 bg-slate-900/40 p-5 backdrop-blur transition-all hover:-translate-y-0.5 hover:border-fluxo-500/50 hover:bg-slate-900/70">
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-fluxo-500/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100"
      />
      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-fluxo-500/10 text-fluxo-400 ring-1 ring-inset ring-fluxo-500/30">
        {icon}
      </div>
      <h3 className="mt-4 font-display text-base font-semibold text-white">{title}</h3>
      <p className="mt-1.5 text-sm text-slate-400">{description}</p>
    </div>
  );
}

function CheckRow({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
      <span className="text-sm text-slate-300">{text}</span>
    </div>
  );
}
