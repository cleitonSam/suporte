import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Apple,
  ArrowRight,
  Copy,
  Download,
  ExternalLink,
  FileCode,
  Monitor,
  Shield,
  Smartphone,
  Tablet,
  Terminal,
} from 'lucide-react';
import {
  DOWNLOADS,
  RUSTDESK_VERSION,
  RUSTDESK_RELEASE_URL,
  getServerConfig,
  generateConfigToml,
  type DownloadOption,
} from '@/lib/rustdesk';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { RustDeskConfigCopy } from './rustdesk-config-copy';

export const metadata: Metadata = {
  title: 'RustDesk · Ferramentas · Admin',
};

export const dynamic = 'force-dynamic';

const OS_LABEL: Record<DownloadOption['os'], { icon: React.ReactNode; label: string }> = {
  windows: { icon: <Monitor className="h-4 w-4" aria-hidden="true" />, label: 'Windows' },
  macos: { icon: <Apple className="h-4 w-4" aria-hidden="true" />, label: 'macOS' },
  linux: { icon: <Terminal className="h-4 w-4" aria-hidden="true" />, label: 'Linux' },
  android: { icon: <Smartphone className="h-4 w-4" aria-hidden="true" />, label: 'Android' },
  ios: { icon: <Tablet className="h-4 w-4" aria-hidden="true" />, label: 'iOS' },
};

export default async function AdminRustDeskPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.userType !== 'AGENT') redirect('/admin?error=forbidden');

  const cfg = getServerConfig();
  const toml = cfg.isConfigured ? generateConfigToml(cfg) : '';

  // Equipamentos com rustdeskId cadastrado (atalhos pra conectar rápido)
  const equipWithIds = await db.equipment.findMany({
    where: {
      deletedAt: null,
      status: 'ACTIVE',
      rustdeskId: { not: null },
      client: { deletedAt: null, status: 'ACTIVE' },
    },
    select: {
      id: true,
      name: true,
      rustdeskId: true,
      client: { select: { id: true, name: true } },
    },
    orderBy: [{ client: { name: 'asc' } }, { name: 'asc' }],
    take: 30,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="micro-label-accent">Ferramentas · acesso remoto</p>
          <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white">
            RustDesk
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Configuração do servidor self-hosted, downloads pro time e atalhos de conexão.
          </p>
        </div>
        <Link
          href="/baixar/rustdesk"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          Página pública pros clientes
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </Link>
      </div>

      {/* Config self-hosted */}
      <section
        aria-labelledby="server-heading"
        className="rounded-xl border border-slate-200 bg-white p-6 shadow-elevate dark:border-slate-700 dark:bg-slate-800"
      >
        <div className="flex items-start gap-3">
          <Shield
            className={`mt-0.5 h-5 w-5 shrink-0 ${
              cfg.isConfigured
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-amber-600 dark:text-amber-400'
            }`}
            aria-hidden="true"
          />
          <div className="flex-1 min-w-0">
            <h2 id="server-heading" className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Servidor RustDesk self-hosted
            </h2>

            {cfg.isConfigured ? (
              <>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Configuração carregada do <code className="font-mono-tech text-[11px]">.env</code>. Use esse
                  arquivo TOML em qualquer máquina pra registrar o servidor RustDesk:
                </p>

                <div className="mt-4">
                  <RustDeskConfigCopy toml={toml} />
                </div>

                <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
                  <KvLine label="Host (ID/Relay)" value={cfg.host} />
                  <KvLine label="Chave" value={cfg.key} mask />
                  {cfg.api && <KvLine label="API" value={cfg.api} />}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <a
                    href="/api/rustdesk/config"
                    className="inline-flex items-center gap-1.5 rounded-md bg-fluxo-500 px-3 py-1.5 text-xs font-semibold text-white shadow-fluxo hover:bg-fluxo-600"
                  >
                    <Download className="h-3.5 w-3.5" aria-hidden="true" />
                    Baixar rustdesk-fluxo.toml
                  </a>
                </div>

                <details className="mt-4 rounded-lg border border-slate-200 p-3 text-xs dark:border-slate-700">
                  <summary className="cursor-pointer font-semibold text-slate-700 dark:text-slate-200">
                    Como aplicar a config em cada plataforma
                  </summary>
                  <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-slate-600 dark:text-slate-400">
                    <li>
                      <strong>Windows:</strong> coloque o TOML em{' '}
                      <code className="font-mono-tech">%AppData%\RustDesk\config\RustDesk2.toml</code> e
                      reinicie o app.
                    </li>
                    <li>
                      <strong>macOS:</strong>{' '}
                      <code className="font-mono-tech">~/Library/Preferences/com.carriez.RustDesk/RustDesk2.toml</code>
                    </li>
                    <li>
                      <strong>Linux:</strong>{' '}
                      <code className="font-mono-tech">~/.config/rustdesk/RustDesk2.toml</code>
                    </li>
                    <li>
                      <strong>Atalho universal:</strong> abrir RustDesk → ⓘ ao lado do ID →{' '}
                      <strong>Servidor ID/Relé</strong> → preencher os 3 campos manualmente.
                    </li>
                  </ol>
                </details>
              </>
            ) : (
              <>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Você está usando os relays públicos do projeto RustDesk. Pra ter <strong>seu próprio
                  servidor</strong> (latência menor, dados no Brasil, controle total), defina no{' '}
                  <code className="font-mono-tech text-[11px]">.env</code>:
                </p>
                <pre className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono-tech text-[11px] text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
{`RUSTDESK_SERVER_HOST=rd.fluxodigitaltech.com.br
RUSTDESK_SERVER_KEY=...chave-publica-do-hbbs...
RUSTDESK_API_URL=    # opcional, só se usar rustdesk-server-pro`}
                </pre>
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                  Não sabe gerar a chave?{' '}
                  <a
                    href="https://rustdesk.com/docs/en/self-host/rustdesk-server-oss/install/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-fluxo-600 hover:underline dark:text-cyan-400"
                  >
                    Guia oficial de self-hosting
                  </a>
                  . Roda em VPS pequena (1vCPU/1GB).
                </p>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Downloads pro time */}
      <section
        aria-labelledby="downloads-heading"
        className="rounded-xl border border-slate-200 bg-white p-6 shadow-elevate dark:border-slate-700 dark:bg-slate-800"
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="downloads-heading" className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Instaladores pro time
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Versão atual: <strong className="font-mono-tech">v{RUSTDESK_VERSION}</strong> ·{' '}
              <a
                href={RUSTDESK_RELEASE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-fluxo-600 hover:underline dark:text-cyan-400"
              >
                Changelog ↗
              </a>
            </p>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="border-b border-slate-200 text-left text-[10px] uppercase tracking-wide text-slate-500 dark:border-slate-700">
              <tr>
                <th scope="col" className="py-2 font-medium">Plataforma</th>
                <th scope="col" className="py-2 font-medium">Variante</th>
                <th scope="col" className="py-2 font-medium">Tamanho</th>
                <th scope="col" className="py-2 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {DOWNLOADS.map((d) => (
                <tr key={d.id}>
                  <td className="py-2">
                    <span className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                      {OS_LABEL[d.os].icon}
                      {OS_LABEL[d.os].label}
                    </span>
                  </td>
                  <td className="py-2 text-slate-600 dark:text-slate-400">
                    <span className="font-medium text-slate-900 dark:text-white">{d.label}</span>
                    <span className="ml-1 text-[10px] text-slate-400">· {d.hint}</span>
                  </td>
                  <td className="py-2 font-mono-tech text-slate-500">{d.approxSize}</td>
                  <td className="py-2 text-right">
                    <a
                      href={d.url}
                      {...(d.variant !== 'store'
                        ? { download: true }
                        : { target: '_blank', rel: 'noopener noreferrer' })}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                    >
                      <Download className="h-3 w-3" aria-hidden="true" />
                      Baixar
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Atalhos rápidos pra equipamentos */}
      <section
        aria-labelledby="quick-heading"
        className="rounded-xl border border-slate-200 bg-white p-6 shadow-elevate dark:border-slate-700 dark:bg-slate-800"
      >
        <h2 id="quick-heading" className="font-display text-lg font-bold text-slate-900 dark:text-white">
          Conectar rápido em equipamentos
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          {equipWithIds.length === 0
            ? 'Nenhum equipamento tem RustDesk ID cadastrado ainda. Adicione em /admin/inventario.'
            : `${equipWithIds.length} equipamento${equipWithIds.length === 1 ? '' : 's'} com RustDesk ID — clique pra conectar.`}
        </p>

        {equipWithIds.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="border-b border-slate-200 text-left text-[10px] uppercase tracking-wide text-slate-500 dark:border-slate-700">
                <tr>
                  <th scope="col" className="py-2 font-medium">Cliente</th>
                  <th scope="col" className="py-2 font-medium">Equipamento</th>
                  <th scope="col" className="py-2 font-medium">ID RustDesk</th>
                  <th scope="col" className="py-2 text-right font-medium">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {equipWithIds.map((eq) => (
                  <tr key={eq.id}>
                    <td className="py-2">
                      <Link
                        href={`/admin/clientes/${eq.client.id}`}
                        className="text-slate-700 hover:text-fluxo-600 dark:text-slate-200"
                      >
                        {eq.client.name}
                      </Link>
                    </td>
                    <td className="py-2 text-slate-900 dark:text-white">{eq.name}</td>
                    <td className="py-2">
                      <code className="font-mono-tech text-[11px] text-slate-600 dark:text-slate-400">
                        {eq.rustdeskId}
                      </code>
                    </td>
                    <td className="py-2 text-right">
                      <a
                        href={`rustdesk://${eq.rustdeskId}`}
                        className="inline-flex items-center gap-1 rounded-md bg-fluxo-500 px-2 py-1 text-[11px] font-semibold text-white shadow-fluxo hover:bg-fluxo-600"
                      >
                        <Monitor className="h-3 w-3" aria-hidden="true" />
                        Conectar
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Links externos uteis */}
      <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs dark:border-slate-700 dark:bg-slate-900">
        <p className="font-mono-tech text-[10px] uppercase tracking-tech text-slate-500">Links úteis</p>
        <ul className="mt-2 space-y-1.5">
          <li>
            <a
              href="https://rustdesk.com/docs/en/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-fluxo-600 hover:underline dark:text-cyan-400"
            >
              <FileCode className="h-3 w-3" aria-hidden="true" />
              Documentação oficial
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </a>
          </li>
          <li>
            <a
              href="https://github.com/rustdesk/rustdesk-server"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-fluxo-600 hover:underline dark:text-cyan-400"
            >
              <FileCode className="h-3 w-3" aria-hidden="true" />
              rustdesk-server (OSS) · setup self-hosted
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </a>
          </li>
          <li>
            <a
              href="https://rustdesk.com/docs/en/self-host/rustdesk-server-pro/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-fluxo-600 hover:underline dark:text-cyan-400"
            >
              <FileCode className="h-3 w-3" aria-hidden="true" />
              rustdesk-server-pro · versão paga com API web
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </a>
          </li>
        </ul>
      </section>
    </div>
  );
}

function KvLine({ label, value, mask = false }: { label: string; value: string; mask?: boolean }) {
  const display = mask && value.length > 12 ? `${value.slice(0, 6)}…${value.slice(-4)}` : value;
  return (
    <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900">
      <p className="font-mono-tech text-[9px] uppercase tracking-tech text-slate-500">{label}</p>
      <p className="mt-0.5 truncate font-mono-tech text-[11px] text-slate-900 dark:text-white">
        {display || '—'}
      </p>
    </div>
  );
}
