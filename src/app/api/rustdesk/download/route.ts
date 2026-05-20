import { NextResponse } from 'next/server';
import { findDownload } from '@/lib/rustdesk';

export const runtime = 'nodejs';

/**
 * GET /api/rustdesk/download?os=windows-x64-installer
 *
 * Redirect 302 pro binário oficial. Mantém o link curto/estável
 * mesmo quando a versão mudar — só atualizar src/lib/rustdesk.ts.
 *
 * Aceita IDs como 'windows-x64-installer', 'macos-aarch64', etc.
 * Aceita também aliases curtos: 'windows', 'macos', 'linux', 'android', 'ios'.
 */
const ALIASES: Record<string, string> = {
  windows: 'windows-x64-installer',
  win: 'windows-x64-installer',
  mac: 'macos-aarch64',
  macos: 'macos-aarch64',
  linux: 'linux-deb',
  android: 'android-apk',
  ios: 'ios-store',
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const raw = (url.searchParams.get('os') ?? '').trim().toLowerCase();
  const id = ALIASES[raw] ?? raw;

  const opt = findDownload(id);
  if (!opt) {
    return NextResponse.json(
      { error: 'not_found', message: 'OS/variante não encontrada' },
      { status: 404 }
    );
  }

  return NextResponse.redirect(opt.url, 302);
}
