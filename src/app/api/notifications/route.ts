import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { countUnread, listRecent, markRead, markAllRead } from '@/lib/notifications';

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const mode = url.searchParams.get('mode') ?? 'list';
  const userId = session.user.id;

  if (mode === 'count') {
    const unread = await countUnread(userId);
    return NextResponse.json({ unread });
  }

  const limit = Math.min(50, Number(url.searchParams.get('limit') ?? 20));
  const onlyUnread = url.searchParams.get('unread') === '1';
  const [items, unread] = await Promise.all([
    listRecent(userId, limit, onlyUnread),
    countUnread(userId),
  ]);

  return NextResponse.json({ items, unread });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const userId = session.user.id;

  if (body?.all === true) {
    await markAllRead(userId);
    return NextResponse.json({ ok: true });
  }

  if (typeof body?.id === 'string') {
    await markRead(userId, body.id);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'bad_request' }, { status: 400 });
}
