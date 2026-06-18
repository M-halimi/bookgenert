import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateUser, getUserReadingProgress, upsertReadingProgress, getUserLibrary } from '@/lib/db/users';

function getUserId(request: NextRequest): { userId: string; error?: NextResponse } {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return {
      error: NextResponse.json(
        { error: 'x-user-id header is required. Generate a UUID on the client and send it with every request.' },
        { status: 401 },
      ),
      userId: '',
    };
  }
  return { userId };
}

export async function GET(request: NextRequest) {
  const { userId, error } = getUserId(request);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const bookId = searchParams.get('bookId') || undefined;
  const scope = searchParams.get('scope') || 'progress';

  try {
    await getOrCreateUser(userId);

    if (scope === 'library') {
      const library = await getUserLibrary(userId);
      return NextResponse.json({ library });
    }

    const progress = await getUserReadingProgress(userId, bookId);
    return NextResponse.json({ progress });
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch reading progress' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const { userId, error } = getUserId(request);
  if (error) return error;

  let body: {
    bookId?: string;
    progress?: number;
    isSaved?: boolean;
    isLiked?: boolean;
    completed?: boolean;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.bookId) {
    return NextResponse.json({ error: 'bookId is required' }, { status: 400 });
  }

  const bookExists = await prisma.book.findUnique({ where: { id: body.bookId } });
  if (!bookExists) {
    return NextResponse.json({ error: 'Book not found' }, { status: 404 });
  }

  try {
    await getOrCreateUser(userId);

    const result = await upsertReadingProgress(userId, body.bookId, {
      progress: body.progress,
      isSaved: body.isSaved,
      isLiked: body.isLiked,
      completed: body.completed,
    });

    return NextResponse.json({ success: true, entry: result });
  } catch {
    return NextResponse.json(
      { error: 'Failed to update reading progress' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const { userId, error } = getUserId(request);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const bookId = searchParams.get('bookId');

  if (!bookId) {
    return NextResponse.json({ error: 'bookId query parameter is required' }, { status: 400 });
  }

  try {
    await prisma.userBook.deleteMany({
      where: { userId, bookId },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete reading progress' }, { status: 500 });
  }
}
