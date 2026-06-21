import { prisma } from '../lib/prisma';
import { MOODS } from '../lib/moods';
import { SEED_DATA } from '../lib/mood-seed';
import type { MoodId } from '../lib/moods';

async function main() {
  console.log('Seeding database...\n');

  // 1. Seed moods
  console.log('Seeding moods...');
  for (const mood of MOODS) {
    await prisma.mood.upsert({
      where: { id: mood.id },
      update: {
        label: mood.label,
        emoji: mood.emoji,
        description: mood.description,
        color: mood.color,
        keywords: mood.keywords,
        relatedMoods: mood.relatedMoods,
        aiRules: mood.aiRules,
      },
      create: {
        id: mood.id,
        label: mood.label,
        emoji: mood.emoji,
        description: mood.description,
        color: mood.color,
        keywords: mood.keywords,
        relatedMoods: mood.relatedMoods,
        aiRules: mood.aiRules,
      },
    });
  }
  console.log(`  ✓ ${MOODS.length} moods seeded\n`);

  // 2. Seed books from SEED_DATA
  console.log('Seeding books from seed data...');
  let bookCount = 0;
  let moodCount = 0;

  const seenSlugs = new Set<string>();

  for (const entry of SEED_DATA) {
    if (seenSlugs.has(entry.slug)) {
      // Update existing book's moods with additional entries
      const existing = await prisma.book.findUnique({ where: { slug: entry.slug } });
      if (existing) {
        for (const sm of entry.moods) {
          const moodExists = await prisma.bookMood.findUnique({
            where: { bookId_moodId: { bookId: existing.id, moodId: sm.mood } },
          });
          if (!moodExists) {
            await prisma.bookMood.create({
              data: { bookId: existing.id, moodId: sm.mood, score: sm.score, source: 'seed' },
            });
            moodCount++;
          }
        }
      }
      continue;
    }
    seenSlugs.add(entry.slug);

    const book = await prisma.book.upsert({
      where: { slug: entry.slug },
      update: { title: entry.title },
      create: {
        slug: entry.slug,
        title: entry.title,
        source: 'manual',
        moodAnalyzed: true,
      },
    });
    bookCount++;

    // Create book_mood entries
    for (const sm of entry.moods) {
      await prisma.bookMood.upsert({
        where: { bookId_moodId: { bookId: book.id, moodId: sm.mood } },
        update: { score: sm.score, source: 'seed' },
        create: { bookId: book.id, moodId: sm.mood, score: sm.score, source: 'seed' },
      });
      moodCount++;
    }
  }

  console.log(`  ✓ ${bookCount} books seeded`);
  console.log(`  ✓ ${moodCount} mood assignments created\n`);

  // 3. Stats
  const stats = {
    moods: await prisma.mood.count(),
    books: await prisma.book.count(),
    bookMoods: await prisma.bookMood.count(),
    users: await prisma.user.count(),
  };

  console.log('Database seeding complete:');
  console.log(`  Moods:        ${stats.moods}`);
  console.log(`  Books:        ${stats.books}`);
  console.log(`  Mood assign.: ${stats.bookMoods}`);
  console.log(`  Users:        ${stats.users}`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
