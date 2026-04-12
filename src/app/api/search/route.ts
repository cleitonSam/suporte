import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  // Check authentication
  const session = await auth();

  if (!session || !session.user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Get and validate search query
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q')?.trim() || '';

  if (query.length < 2) {
    return NextResponse.json({
      tickets: [],
      clients: [],
      users: [],
    });
  }

  try {
    // Prepare search promises
    const searchPromises: Promise<any>[] = [];

    // 1. Search tickets
    const ticketsPromise = db.ticket.findMany({
      where: {
        deletedAt: null,
        ...(session.user.userType === 'CLIENT_CONTACT' && {
          clientId: session.user.clientId,
        }),
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { ticketNumber: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        ticketNumber: true,
        title: true,
        status: true,
        priority: true,
      },
      take: 5,
    });

    searchPromises.push(ticketsPromise);

    // 2. Search clients (only for AGENT)
    const clientsPromise = session.user.userType === 'AGENT'
      ? db.client.findMany({
          where: {
            deletedAt: null,
            status: 'ACTIVE',
            name: { contains: query, mode: 'insensitive' },
          },
          select: {
            id: true,
            name: true,
            document: true,
          },
          take: 5,
        })
      : Promise.resolve([]);

    searchPromises.push(clientsPromise);

    // 3. Search users (only for AGENT)
    const usersPromise = session.user.userType === 'AGENT'
      ? db.user.findMany({
          where: {
            deletedAt: null,
            isActive: true,
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { email: { contains: query, mode: 'insensitive' } },
            ],
          },
          select: {
            id: true,
            name: true,
            email: true,
            userType: true,
          },
          take: 5,
        })
      : Promise.resolve([]);

    searchPromises.push(usersPromise);

    // Execute all queries in parallel
    const [tickets, clients, users] = await Promise.all(searchPromises);

    return NextResponse.json({
      tickets,
      clients,
      users,
    });
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
