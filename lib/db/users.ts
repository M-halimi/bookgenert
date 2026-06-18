import { prisma } from '@/lib/prisma';

export async function getOrCreateUser(userId?: string, email?: string) {
  if (userId) {
    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (existing) return existing;
  }

  if (email) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return existing;
  }

  return prisma.user.create({
    data: {
      ...(userId ? { id: userId } : {}),
      ...(email ? { email } : {}),
    },
  });
}

export async function getUserReadingProgress(userId: string, bookId?: string) {
  const where = bookId ? { userId, bookId } : { userId };

  const entries = await prisma.userBook.findMany({
    where,
    include: { book: { include: { author: true } } },
    orderBy: { updatedAt: 'desc' },
  });

  return entries;
}

export async function upsertReadingProgress(
  userId: string,
  bookId: string,
  data: {
    progress?: number;
    isSaved?: boolean;
    isLiked?: boolean;
    completed?: boolean;
  },
) {
  const existing = await prisma.userBook.findUnique({
    where: { userId_bookId: { userId, bookId } },
  });

  const updateData: Record<string, unknown> = {};
  if (data.progress !== undefined) updateData.progress = data.progress;
  if (data.isSaved !== undefined) updateData.isSaved = data.isSaved;
  if (data.isLiked !== undefined) updateData.isLiked = data.isLiked;
  if (data.completed !== undefined) updateData.completed = data.completed;

  if (data.completed === true && (!existing || !existing.completed)) {
    updateData.completedAt = new Date();
  }

  if (data.progress !== undefined && !existing) {
    updateData.startedAt = new Date();
  }

  return prisma.userBook.upsert({
    where: { userId_bookId: { userId, bookId } },
    update: updateData,
    create: {
      userId,
      bookId,
      progress: data.progress ?? 0,
      isSaved: data.isSaved ?? false,
      isLiked: data.isLiked ?? false,
      completed: data.completed ?? false,
      ...(data.completed ? { completedAt: new Date() } : {}),
    },
    include: { book: { include: { author: true } } },
  });
}

export async function getUserLibrary(userId: string) {
  const entries = await prisma.userBook.findMany({
    where: { userId, isSaved: true },
    include: { book: { include: { author: true, moods: { include: { mood: true } } } } },
    orderBy: { updatedAt: 'desc' },
  });

  return entries.map((e) => ({
    ...e.book,
    progress: e.progress,
    isSaved: e.isSaved,
    isLiked: e.isLiked,
    completed: e.completed,
    startedAt: e.startedAt,
    completedAt: e.completedAt,
  }));
}
