import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  if (!slug) {
    return NextResponse.json({ error: 'slug is required' }, { status: 400 });
  }

  try {
    const book = await prisma.book.findUnique({
      where: { slug },
      include: {
        chapters: { orderBy: { chapterNumber: 'asc' } },
        bookSummary: true,
        embedding: true,
      },
    });

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    const episodes = book.episodes as Record<string, unknown> | null;

    return NextResponse.json({
      id: book.id,
      slug: book.slug,
      title: book.title,
      description: book.description,
      tagline: book.tagline,
      coverImage: book.coverImage,
      coverPrompt: book.coverPrompt,
      category: book.category,
      author: book.authorId,
      episodes,
      chapters: book.chapters.map((ch) => ({
        number: ch.chapterNumber,
        title: ch.title,
        content: ch.content,
        hook: ch.hook,
        keyTakeaway: ch.keyTakeaway,
        keyIdeas: ch.keyIdeas,
        actionableTips: ch.actionableTips,
        importantQuotes: ch.importantQuotes,
        practicalExamples: ch.practicalExamples,
        cliffhanger: ch.cliffhanger,
        summary: ch.summary,
        wordCount: ch.wordCount,
      })),
      finalSummary: book.finalSummary,
      mainConcepts: book.mainConcepts,
      keyLessons: book.keyLessons,
      keyInsights: book.keyInsights,
      implementationGuide: book.implementationGuide,
      summary: book.bookSummary,
      generationStatus: book.generationStatus,
      createdAt: book.createdAt.toISOString(),
    });
  } catch (error) {
    console.error('Book content fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch book content' },
      { status: 500 },
    );
  }
}
