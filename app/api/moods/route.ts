import { NextRequest, NextResponse } from 'next/server';
import { getAllMoods, getMoodStats } from '@/lib/db/moods';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const includeStats = searchParams.get('stats') === 'true';

  if (includeStats) {
    const stats = await getMoodStats();
    return NextResponse.json(stats);
  }

  const moods = await getAllMoods();
  return NextResponse.json({ moods });
}
