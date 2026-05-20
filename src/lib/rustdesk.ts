/**
 * Lib central RustDesk: versão atual, URLs de download, deeplinks
 * e geração de config TOML pra servidores self-hosted.
 *
 * Pra atualizar a versão, basta mexer em VERSION abaixo.
 * Releases oficiais: https://github.com/rustdesk/rustdesk/releases
 */

export const RUSTDESK_VERSION = '1.4.2';
export const RUSTDESK_RELEASE_URL = `https://github.com/rustdesk/rustdesk/releases/tag/${RUSTDESK_VERSION}`;

const RELEASE_BASE = `https://github.com/rustdesk/rustdesk/releases/download/${RUSTDESK_VERSION}`;

export interface DownloadOption {
  /** Identificador estável, usado no endpoint /api/rustdesk/download?os=...  */
  id: string;
  /** OS principal */
  os: 'windows' | 'macos' | 'linux' | 'android' | 'ios';
  /** Arquitetura (quando relevante) */
  arch?: 'x86_64' | 'aarch64' | 'i686';
  /** Variante de instalação */
  variant?: 'installer' | 'portable' | 'dmg' | 'deb' | 'rpm' | 'appimage' | 'apk' | 'store';
  /** Nome amigável exibido na UI */
  label: string;
  /** Sub-label técnico */
  hint: string;
  /** URL direta do binário (ou loja, no caso de iOS) */
  url: string;
  /** Tamanho aproximado, pra dar contexto na UI */
  approxSize: string;
}

export const DOWNLOADS: DownloadOption[] = [
  {
    id: 'windows-x64-installer',
    os: 'windows',
    arch: 'x86_64',
    variant: 'installer',
    label: 'Windows 10/11 (64-bit)',
    hint: 'Instalador .exe',
    url: `${RELEASE_BASE}/rustdesk-${RUSTDESK_VERSION}-x86_64.exe`,
    approxSize: '~50 MB',
  },
  {
    id: 'windows-x64-portable',
    os: 'windows',
    arch: 'x86_64',
    variant: 'portable',
    label: 'Windows portátil',
    hint: 'Roda sem instalar',
    url: `${RELEASE_BASE}/rustdesk-${RUSTDESK_VERSION}-x86_64.exe`,
    approxSize: '~50 MB',
  },
  {
    id: 'macos-aarch64',
    os: 'macos',
    arch: 'aarch64',
    variant: 'dmg',
    label: 'macOS (Apple Silicon)',
    hint: 'M1, M2, M3, M4',
    url: `${RELEASE_BASE}/rustdesk-${RUSTDESK_VERSION}-aarch64.dmg`,
    approxSize: '~75 MB',
  },
  {
    id: 'macos-x64',
    os: 'macos',
    arch: 'x86_64',
    variant: 'dmg',
    label: 'macOS (Intel)',
    hint: 'Macs Intel pré-2020',
    url: `${RELEASE_BASE}/rustdesk-${RUSTDESK_VERSION}-x86_64.dmg`,
    approxSize: '~75 MB',
  },
  {
    id: 'linux-deb',
    os: 'linux',
    arch: 'x86_64',
    variant: 'deb',
    label: 'Linux (.deb)',
    hint: 'Ubuntu, Debian, Mint',
    url: `${RELEASE_BASE}/rustdesk-${RUSTDESK_VERSION}-x86_64.deb`,
    approxSize: '~25 MB',
  },
  {
    id: 'linux-rpm',
    os: 'linux',
    arch: 'x86_64',
    variant: 'rpm',
    label: 'Linux (.rpm)',
    hint: 'Fedora, RHEL, openSUSE',
    url: `${RELEASE_BASE}/rustdesk-${RUSTDESK_VERSION}-0.x86_64.rpm`,
    approxSize: '~25 MB',
  },
  {
    id: 'linux-appimage',
    os: 'linux',
    arch: 'x86_64',
    variant: 'appimage',
    label: 'Linux (AppImage)',
    hint: 'Roda em qualquer distro',
    url: `${RELEASE_BASE}/rustdesk-${RUSTDESK_VERSION}-x86_64.AppImage`,
    approxSize: '~80 MB',
  },
  {
    id: 'android-apk',
    os: 'android',
    variant: 'apk',
    label: 'Android (APK)',
    hint: 'Instalação manual',
    url: `${RELEASE_BASE}/rustdesk-${RUSTDESK_VERSION}.apk`,
    approxSize: '~60 MB',
  },
  {
    id: 'ios-store',
    os: 'ios',
    variant: 'store',
    label: 'iOS / iPadOS',
    hint: 'App Store',
    url: 'https://apps.apple.com/app/rustdesk-remote-desktop/id1581225015',
    approxSize: '—',
  },
];

export function findDownload(id: string): DownloadOption | undefined {
  return DOWNLOADS.find((d) => d.id === id);
}

export type DetectedOs = DownloadOption['os'] | 'unknown';

/**
 * Detecta OS a partir do User-Agent.
 * Pra usar em Server Components: headers().get('user-agent')
 */
export function detectOs(userAgent: string | null | undefined): DetectedOs {
  if (!userAgent) return 'unknown';
  const ua = userAgent.toLowerCase();
  // Android vem antes de Linux (Android contém "linux")
  if (ua.includes('android')) return 'android';
  if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) return 'ios';
  if (ua.includes('mac os') || ua.includes('macintosh')) return 'macos';
  if (ua.includes('windows')) return 'windows';
  if (ua.includes('linux')) return 'linux';
  return 'unknown';
}

/**
 * Sugere o download "principal" pra um OS detectado.
 */
export function recommendedFor(os: DetectedOs): DownloadOption | null {
  switch (os) {
    case 'windows': return findDownload('windows-x64-installer') ?? null;
    case 'macos':   return findDownload('macos-aarch64') ?? null; // Apple Silicon majoritário hoje
    case 'linux':   return findDownload('linux-deb') ?? null;
    case 'android': return findDownload('android-apk') ?? null;
    case 'ios':     return findDownload('ios-store') ?? null;
    default:        return null;
  }
}

/**
 * Configuração do servidor self-hosted, lida do env.
 * Se host vazio, RustDesk usa rendezvous público do projeto (rs-ny.rustdesk.com etc).
 */
export interface RustDeskServerConfig {
  /** Endereço do servidor hbbs (rendezvous). Ex: rd.fluxodigitaltech.com.br */
  host: string;
  /** Chave pública RustDesk (gerada com `hbbs --key` no servidor) */
  key: string;
  /** Endereço da API web opcional (rustdesk-server-pro). Vazio se não tiver. */
  api: string;
  /** Se config tá completa o suficiente pra mostrar em UI */
  isConfigured: boolean;
}

export function getServerConfig(): RustDeskServerConfig {
  const host = (process.env.RUSTDESK_SERVER_HOST ?? '').trim();
  const key = (process.env.RUSTDESK_SERVER_KEY ?? '').trim();
  const api = (process.env.RUSTDESK_API_URL ?? '').trim();
  return {
    host,
    key,
    api,
    isConfigured: host.length > 0 && key.length > 0,
  };
}

/**
 * Gera TOML pronto pra colar em `~/.config/rustdesk/RustDesk2.toml`
 * ou importar via Settings → Network → Import server config.
 */
export function generateConfigToml(cfg: RustDeskServerConfig): string {
  const lines = [
    '# Configuração Fluxo Suporte — RustDesk',
    `# Gerado em ${new Date().toISOString()}`,
    '[options]',
    `custom-rendezvous-server = "${cfg.host}"`,
    `key = "${cfg.key}"`,
  ];
  if (cfg.api) {
    lines.push(`api-server = "${cfg.api}"`);
    lines.push(`relay-server = "${cfg.host}"`);
  }
  lines.push('');
  return lines.join('\n');
}

/**
 * Deeplink pra conectar direto num peer. Funciona se RustDesk
 * estiver instalado no SO do usuário.
 *
 * Formatos suportados pelo RustDesk:
 *   rustdesk://<id>
 *   rustdesk://connection/new/<id>
 */
export function buildDeepLink(rustdeskId: string): string {
  const clean = rustdeskId.replace(/\s+/g, '');
  return `rustdesk://${clean}`;
}

/**
 * Agrupa downloads por OS pra renderização em cards.
 */
export function groupedDownloads() {
  const groups = new Map<DownloadOption['os'], DownloadOption[]>();
  for (const d of DOWNLOADS) {
    if (!groups.has(d.os)) groups.set(d.os, []);
    groups.get(d.os)!.push(d);
  }
  return groups;
}
