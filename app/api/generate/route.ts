import { NextRequest, NextResponse } from 'next/server';
import { generateEpisodes } from '@/lib/groq';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, author } = body;

    if (!title || typeof title !== 'string') {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    const episodes = await generateEpisodes(title, author);
    return NextResponse.json(episodes);
  } catch (error) {
    console.error('Generation error:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate book';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
