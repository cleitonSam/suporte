import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getServerConfig, generateConfigToml } from '@/lib/rustdesk';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/rustdesk/config
 *
 * Retorna a config TOML do servidor self-hosted como download (.toml).
 * Requer autenticação — config tem a chave do servidor, não é público.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const cfg = getServerConfig();
  if (!cfg.isConfigured) {
    return NextResponse.json(
      {
        error: 'not_configured',
        message: 'RUSTDESK_SERVER_HOST e RUSTDESK_SERVER_KEY não estão definidos no .env',
      },
      { status: 503 }
    );
  }

  const toml = generateConfigToml(cfg);

  return new NextResponse(toml, {
    status: 200,
    headers: {
      'Content-Type': 'application/toml; charset=utf-8',
      'Content-Disposition': 'attachment; filename="rustdesk-fluxo.toml"',
      'Cache-Control': 'no-store',
    },
  });
}
