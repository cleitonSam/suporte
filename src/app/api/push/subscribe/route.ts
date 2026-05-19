import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

interface SubscribePayload {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payload: SubscribePayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!payload.endpoint || !payload.keys?.p256dh || !payload.keys?.auth) {
    return NextResponse.json({ error: 'Invalid subscription payload' }, { status: 400 });
  }

  const userAgent = req.headers.get('user-agent')?.slice(0, 500) ?? null;

  try {
    // upsert: substitui se mesmo endpoint ja existir (mudou de user, etc)
    await db.pushSubscription.upsert({
      where: { endpoint: payload.endpoint },
      update: {
        userId: session.user.id,
        p256dh: payload.keys.p256dh,
        auth: payload.keys.auth,
        userAgent,
        lastUsedAt: new Date(),
      },
      create: {
        userId: session.user.id,
        endpoint: payload.endpoint,
        p256dh: payload.keys.p256dh,
        auth: payload.keys.auth,
        userAgent,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error({ err, userId: session.user.id }, '[push:subscribe] erro');
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { endpoint } = await req.json().catch(() => ({ endpoint: null }));
  if (!endpoint) {
    return NextResponse.json({ error: 'endpoint required' }, { status: 400 });
  }

  try {
    await db.pushSubscription.deleteMany({
      where: { endpoint, userId: session.user.id },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error({ err }, '[push:unsubscribe] erro');
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
