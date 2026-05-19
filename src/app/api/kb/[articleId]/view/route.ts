import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ articleId: string }> }
) {
  try {
    const { articleId } = await params;

    const existing = await db.kbArticle.findFirst({
      where: { id: articleId, deletedAt: null },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    // Increment the view count
    const article = await db.kbArticle.update({
      where: { id: articleId },
      data: {
        viewCount: { increment: 1 },
      },
      select: {
        id: true,
        viewCount: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        viewCount: article.viewCount,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[KB View] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
