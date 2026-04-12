import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ articleId: string }> }
) {
  try {
    const { articleId } = await params;

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
