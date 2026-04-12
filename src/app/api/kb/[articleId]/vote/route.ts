import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ articleId: string }> }
) {
  try {
    const { articleId } = await params;

    const body = await request.json();
    const { helpful } = body;

    if (typeof helpful !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid helpful value' },
        { status: 400 }
      );
    }

    // Update the article with the helpful vote
    const article = await db.kbArticle.update({
      where: { id: articleId },
      data: {
        ...(helpful ? { helpfulYes: { increment: 1 } } : { helpfulNo: { increment: 1 } }),
      },
      select: {
        id: true,
        helpfulYes: true,
        helpfulNo: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        helpfulYes: article.helpfulYes,
        helpfulNo: article.helpfulNo,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[KB Vote] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
