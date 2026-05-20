import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import {
  Apple,
  Download,
  HelpCircle,
  Laptop,
  Monitor,
  Shield,
  Smartphone,
  Sparkles,
  Tablet,
  Terminal,
  Zap,
} from 'lucide-react';
import {
  DOWNLOADS,
  RUSTDESK_VERSION,
  RUSTDESK_RELEASE_URL,
  detectOs,
  recommendedFor,
  getServerConfig,
  type DownloadOption,
  type DetectedOs,
} from '@/lib/rustdesk';
import { LogoFluxo } from '@/components/logo-fluxo';

export const metadata: Metadata = {
  title: 'Baixar RustDesk · Fluxo Suporte',
  description:
    'Baixe o RustDesk pra que o time da Fluxo possa te dar suporte remoto seguro. Disponível pra Windows, macOS, Linux, Android e iOS.',
  robots: { index: true, follow: true },
};

export const dynamic = 'force-dynamic';

const OS_ORDER: Array<DownloadOption['os']> = ['windows', 'macos', 'linux', 'android', 'ios'];

const OS_META: Record<
  DownloadOption['os'],
  { label: string; icon: React.ReactNode; accent: string }
> = {
  windows: {
    label: 'Windows',
    icon: <Monitor className="h-5 w-5" aria-hidden="true" />,
    accent: 'fluxo',
  },
  macos: {
    label: 'macOS',
    icon: <Apple className="h-5 w-5" aria-hidden="true" />,
    accent: 'slate',
  },
  linux: {
    label: 'Linux',
    icon: <Terminal className="h-5 w-5" aria-hidden="true" />,
    accent: 'amber',
  },
  android: {
    label: 'Android',
    icon: <Smartphone className="h-5 w-5" aria-hidden="true" />,
    accent: 'emerald',
  },
  ios: {
    label: 'iOS / iPadOS',
    icon: <Tablet className="h-5 w-5" aria-hidden="true" />,
    accent: 'purple',
  },
};

function osAccentClass(accent: string): string {
  const map: Record<string, string> = {
    fluxo: 'bg-fluxo-500/10 text-fluxo-600 ring-fluxo-500/20 dark:bg-fluxo-500/15 dark:text-fluxo-300',
    slate: 'bg-slate-500/10 text-slate-700 ring-slate-500/20 dark:bg-slate-500/15 dark:text-slate-300',
    amber: 'bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:bg-amber-500/15 dark:text-amber-300',
    emerald: 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-300',
    purple: 'bg-purple-500/10 text-purple-700 ring-purple-500/20 dark:bg-purple-500/15 dark:text-purple-300',
  };
  return map[accent] ?? map.fluxo;
}

export default function BaixarRustDeskPage() {
  const ua = headers().get('user-agent');
  const detected = detectOs(ua);
  const recommended = recommendedFor(detected);
  const cfg = getServerConfig();

  const grouped = OS_ORDER.map((os) => ({
    os,
    items: DOWNLOADS.filter((d) => d.os === os),
  }));

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Nav simples */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <LogoFluxo size="sm" className="dark:brightness-0 dark:invert" />
            <span className="font-display text-sm font-bold text-slate-900 dark:text-white">
              Suporte
            </span>
          </Link>
          <Link
            href="/portal"
            className="text-xs font-medium text-fluxo-600 hover:text-fluxo-700 dark:text-cyan-400"
          >
            Acessar portal →
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 shadow-elevate dark:border-slate-700 dark:bg-slate-800 sm:p-12">
          <div
            aria-hidden="true"
            className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-fluxo-500/10 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl"
          />

          <div className="relative">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-fluxo-200 bg-fluxo-50 px-2.5 py-0.5 dark:border-fluxo-700/60 dark:bg-fluxo-950/40">
              <Sparkles className="h-3 w-3 text-fluxo-600 dark:text-cyan-400" aria-hidden="true" />
              <span className="font-mono-tech text-[10px] uppercase tracking-tech text-fluxo-700 dark:text-cyan-300">
                Acesso remoto seguro
              </span>
            </div>

            <h1 className="mt-4 font-display text-3xl font-bold leading-tight text-slate-900 dark:text-white sm:text-4xl">
              Instale o RustDesk pra <span className="text-fluxo-500">receber suporte</span> em segundos.
            </h1>

            <p className="mt-3 max-w-2xl text-sm text-slate-600 dark:text-slate-300 sm:text-base">
              O RustDesk é um software de acesso remoto open source que usamos pra te atender
              de forma rápida e segura. Sem cadastro, sem conta. Você baixa, abre, manda o ID
              de 9 dígitos pro técnico e ele conecta — só com sua autorização.
            </p>

            {/* Botão recomendado pra OS detectado */}
            {recommended && (
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <a
                  href={recommended.url}
                  download
                  className="inline-flex items-center gap-2 rounded-md bg-fluxo-500 px-5 py-3 text-sm font-semibold text-white shadow-fluxo transition hover:bg-fluxo-600"
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Baixar pra {OS_META[recommended.os].label}
                  <span className="font-mono-tech text-[10px] opacity-80">v{RUSTDESK_VERSION}</span>
                </a>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Detectamos {OS_META[recommended.os].label} no seu dispositivo · {recommended.approxSize}
                </span>
              </div>
            )}

            {!recommended && (
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <a
                  href="#downloads"
                  className="inline-flex items-center gap-2 rounded-md bg-fluxo-500 px-5 py-3 text-sm font-semibold text-white shadow-fluxo transition hover:bg-fluxo-600"
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Ver opções de download
                </a>
              </div>
            )}

            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Feature icon={<Zap className="h-4 w-4" />} label="Rápido" desc="Conecta em 5 segundos" />
              <Feature icon={<Shield className="h-4 w-4" />} label="Seguro" desc="Criptografia ponta-a-ponta" />
              <Feature icon={<Laptop className="h-4 w-4" />} label="Sem instalar" desc="Versão portátil disponível" />
              <Feature icon={<HelpCircle className="h-4 w-4" />} label="Open source" desc="GitHub público" />
            </div>
          </div>
        </section>

        {/* Cards de download */}
        <section id="downloads" className="mt-12 space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
                Todas as plataformas
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Versão atual: <strong className="font-mono-tech text-slate-900 dark:text-white">v{RUSTDESK_VERSION}</strong>{' '}
                ·{' '}
                <a
                  href={RUSTDESK_RELEASE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-fluxo-600 hover:underline dark:text-cyan-400"
                >
                  Ver changelog ↗
                </a>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {grouped.map(({ os, items }) => (
              <OsCard
                key={os}
                os={os}
                items={items}
                highlight={detected === os}
              />
            ))}
          </div>
        </section>

        {/* Como funciona */}
        <section className="mt-12 rounded-xl border border-slate-200 bg-white p-6 shadow-elevate dark:border-slate-700 dark:bg-slate-800 sm:p-8">
          <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
            Como funciona — passo a passo
          </h2>
          <ol className="mt-4 space-y-4">
            <Step
              n={1}
              title="Baixe e abra o RustDesk"
              desc="Use o botão grande lá em cima ou escolha sua plataforma nos cards. No Windows você pode usar a versão portátil (não precisa instalar)."
            />
            <Step
              n={2}
              title="Anote o seu ID (9 dígitos)"
              desc='Ao abrir, o RustDesk mostra um número como "123 456 789". Esse é o seu ID. A senha aparece embaixo (6 dígitos).'
            />
            <Step
              n={3}
              title="Passe o ID e a senha pro técnico"
              desc="Por WhatsApp, telefone, email — como combinarem. O técnico digita do lado dele e clica em conectar."
            />
            <Step
              n={4}
              title="Você AUTORIZA a conexão"
              desc='Quando o técnico conectar, o RustDesk pergunta "Aceitar conexão?". Você clica em Aceitar e ele assume o controle. Você vê tudo na tela em tempo real.'
            />
            <Step
              n={5}
              title="Quando terminar, é só fechar"
              desc="Acabou? Fecha o programa. Sem o RustDesk aberto, ninguém consegue se conectar à sua máquina."
            />
          </ol>
        </section>

        {/* Config self-hosted (se houver) */}
        {cfg.isConfigured && (
          <section className="mt-8 rounded-xl border border-fluxo-200 bg-fluxo-50/60 p-6 dark:border-fluxo-900/60 dark:bg-fluxo-950/30 sm:p-8">
            <div className="flex items-start gap-3">
              <Shield className="mt-0.5 h-5 w-5 shrink-0 text-fluxo-600 dark:text-cyan-400" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                  Servidor próprio Fluxo
                </h2>
                <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                  Os clientes da Fluxo Digital Tech usam nosso servidor RustDesk dedicado, sem
                  passar pelos relays públicos. Latência menor e dados que não saem do Brasil.
                </p>
                <p className="mt-3 text-xs text-slate-600 dark:text-slate-400">
                  Após instalar, abra o RustDesk → ⓘ ao lado do ID → <strong>Servidor ID/Relé</strong>.
                  Preencha:
                </p>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <CfgLine label="Servidor ID" value={cfg.host} />
                  <CfgLine label="Servidor Relay" value={cfg.host} />
                  <CfgLine label="Chave" value={cfg.key} />
                  {cfg.api && <CfgLine label="API" value={cfg.api} />}
                </div>
                <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">
                  Dica: os técnicos do time podem baixar o arquivo de config pronto em{' '}
                  <Link href="/admin/ferramentas/rustdesk" className="text-fluxo-600 hover:underline dark:text-cyan-400">
                    /admin/ferramentas/rustdesk
                  </Link>{' '}
                  (login necessário).
                </p>
              </div>
            </div>
          </section>
        )}

        {/* FAQ */}
        <section className="mt-12 space-y-3">
          <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
            Perguntas comuns
          </h2>
          <Faq q="É seguro? Vou perder o controle do computador?">
            Não. O RustDesk só conecta com SUA autorização — toda vez. Quando você fecha o
            programa, ninguém mais consegue entrar. E o tráfego é criptografado ponta-a-ponta;
            nem o servidor que intermedeia consegue ver o que está sendo transmitido.
          </Faq>
          <Faq q="Preciso pagar?">
            Não. O RustDesk é open source e gratuito. A Fluxo paga pela infraestrutura do
            servidor — pra você não precisa cadastro nem mensalidade.
          </Faq>
          <Faq q="Por que não usam TeamViewer/AnyDesk?">
            TeamViewer e AnyDesk são pagos por sessão pra uso comercial e às vezes acusam
            "uso comercial detectado" no meio do atendimento, te trancando fora. RustDesk não
            tem esse problema: aberto, sem licença, sem surpresa.
          </Faq>
          <Faq q="Funciona em Mac M1/M2/M3/M4?">
            Sim. Use o instalador <strong>Apple Silicon</strong> no card do macOS. Macs Intel
            antigos usam a versão "Intel".
          </Faq>
          <Faq q="Estou no celular, dá pra receber suporte aí também?">
            Dá. Tem versão Android (APK) e iOS (App Store). Útil pra dúvidas pontuais —
            mas pra suporte de verdade, melhor estar no computador.
          </Faq>
          <Faq q="Posso fechar o RustDesk depois?">
            Sim, e recomendamos. Só abra quando precisar de atendimento. Se quiser deixar
            sempre aberto pra que a Fluxo conecte sem te avisar (servidor monitorado 24/7),
            fale com o time — fazemos a configuração de "acesso desatendido" com senha forte.
          </Faq>
        </section>

        <footer className="mt-16 border-t border-slate-200 pt-6 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-500">
          <p>
            RustDesk é um projeto open source ·{' '}
            <a
              href="https://rustdesk.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              rustdesk.com
            </a>{' '}
            ·{' '}
            <a
              href={RUSTDESK_RELEASE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              v{RUSTDESK_VERSION}
            </a>
          </p>
          <p className="mt-2">
            Página servida pela <strong>Fluxo Digital Tech</strong> · suporte de TI brasileiro
          </p>
        </footer>
      </main>
    </div>
  );
}

function Feature({ icon, label, desc }: { icon: React.ReactNode; label: string; desc: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span
        aria-hidden="true"
        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-fluxo-500/10 text-fluxo-600 ring-1 ring-inset ring-fluxo-500/20 dark:text-cyan-400"
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">{label}</p>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">{desc}</p>
      </div>
    </div>
  );
}

function OsCard({
  os,
  items,
  highlight,
}: {
  os: DownloadOption['os'];
  items: DownloadOption[];
  highlight: boolean;
}) {
  const meta = OS_META[os];
  return (
    <article
      className={`relative flex flex-col rounded-xl border bg-white p-5 shadow-elevate transition-all hover:-translate-y-0.5 hover:shadow-elevate-lg dark:bg-slate-800 ${
        highlight
          ? 'border-fluxo-300 ring-2 ring-fluxo-500/30 dark:border-fluxo-700'
          : 'border-slate-200 dark:border-slate-700'
      }`}
    >
      {highlight && (
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-fluxo-500 px-2 py-0.5 font-mono-tech text-[9px] uppercase tracking-tech text-white shadow-fluxo">
          Detectado
        </span>
      )}
      <header className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className={`flex h-10 w-10 items-center justify-center rounded-lg ring-1 ring-inset ${osAccentClass(meta.accent)}`}
        >
          {meta.icon}
        </span>
        <div className="min-w-0">
          <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
            {meta.label}
          </h3>
        </div>
      </header>

      <ul className="mt-4 flex-1 space-y-2">
        {items.map((d) => (
          <li key={d.id}>
            <a
              href={d.url}
              {...(d.variant !== 'store' ? { download: true } : { target: '_blank', rel: 'noopener noreferrer' })}
              className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs transition-colors hover:border-fluxo-300 hover:bg-fluxo-50/50 dark:border-slate-700 dark:bg-slate-900/50 dark:hover:border-fluxo-700 dark:hover:bg-fluxo-950/30"
            >
              <Download className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-slate-900 dark:text-white">
                  {d.label}
                </span>
                <span className="block truncate text-[10px] text-slate-500 dark:text-slate-400">
                  {d.hint} · {d.approxSize}
                </span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </article>
  );
}

function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <li className="flex gap-4">
      <span
        aria-hidden="true"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-fluxo-500 font-mono-tech text-sm font-bold text-white shadow-fluxo"
      >
        {n}
      </span>
      <div className="flex-1 pt-1">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
        <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">{desc}</p>
      </div>
    </li>
  );
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <details className="group rounded-lg border border-slate-200 bg-white p-4 shadow-elevate dark:border-slate-700 dark:bg-slate-800">
      <summary className="cursor-pointer list-none">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{q}</h3>
          <span
            aria-hidden="true"
            className="font-mono-tech text-xs text-slate-400 transition-transform group-open:rotate-45"
          >
            +
          </span>
        </div>
      </summary>
      <p className="mt-3 text-xs text-slate-600 dark:text-slate-400">{children}</p>
    </details>
  );
}

function CfgLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900">
      <p className="font-mono-tech text-[9px] uppercase tracking-tech text-slate-500">{label}</p>
      <p className="mt-0.5 truncate font-mono-tech text-[11px] text-slate-900 dark:text-white">
        {value || '—'}
      </p>
    </div>
  );
}
