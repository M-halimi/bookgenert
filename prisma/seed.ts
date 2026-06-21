import { prisma } from '../lib/prisma';
import { MOODS } from '../lib/moods';
import { SEED_DATA } from '../lib/mood-seed';
import * as fs from 'fs';
import * as path from 'path';

const EXPORT_FILE = path.join(__dirname, 'yield-export.json');

async function seedStatic() {
  console.log('Seeding static data...\n');

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

  console.log('Seeding books from seed data...');
  let bookCount = 0;
  let moodCount = 0;

  const seenSlugs = new Set<string>();

  for (const entry of SEED_DATA) {
    if (seenSlugs.has(entry.slug)) {
      continue;
    }
    seenSlugs.add(entry.slug);

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
      continue;
    }

    const book = await prisma.book.create({
      data: {
        slug: entry.slug,
        title: { en: entry.title, fr: '', ar: '', de: '' } as any,
        source: 'manual',
        moodAnalyzed: true,
      },
    });
    bookCount++;

    for (const sm of entry.moods) {
      await prisma.bookMood.create({
        data: { bookId: book.id, moodId: sm.mood, score: sm.score, source: 'seed' },
      });
      moodCount++;
    }
  }

  console.log(`  ✓ ${bookCount} books seeded`);
  console.log(`  ✓ ${moodCount} mood assignments created\n`);
}

async function seedFromExport() {
  console.log('Importing from yield-export.json...\n');

  const raw = fs.readFileSync(EXPORT_FILE, 'utf-8');
  const data = JSON.parse(raw);

  const phases = [
    { key: 'moods',             label: 'Moods',             model: 'mood' as const },
    { key: 'authors',           label: 'Authors',           model: 'author' as const },
    { key: 'books',             label: 'Books',             model: 'book' as const },
    { key: 'bookChapters',      label: 'Book Chapters',     model: 'bookChapter' as const },
    { key: 'bookSummaries',     label: 'Book Summaries',    model: 'bookSummary' as const },
    { key: 'bookEmbeddings',    label: 'Book Embeddings',   model: 'bookEmbedding' as const },
    { key: 'bookMoods',         label: 'Book Moods',        model: 'bookMood' as const },
    { key: 'bookCaches',        label: 'Book Caches',       model: 'bookCache' as const },
    { key: 'bookGenerationJobs',label: 'Generation Jobs',   model: 'bookGenerationJob' as const },
    { key: 'apiCaches',         label: 'API Caches',        model: 'apiCache' as const },
    { key: 'users',             label: 'Users',             model: 'user' as const },
    { key: 'userBooks',         label: 'User Books',        model: 'userBook' as const },
    { key: 'userLibraries',     label: 'User Libraries',    model: 'userLibrary' as const },
    { key: 'userWritingDrafts', label: 'Writing Drafts',    model: 'userWritingDraft' as const },
    { key: 'analyticsEvents',   label: 'Analytics Events',  model: 'analyticsEvent' as const },
  ];

  let total = 0;
  let totalSkipped = 0;

  for (const phase of phases) {
    const records = data[phase.key];
    if (!records || records.length === 0) {
      console.log(`  ○ ${phase.label.padEnd(20)} 0 records`);
      continue;
    }
    const result = await (prisma[phase.model] as any).createMany({ data: records, skipDuplicates: true });
    const inserted = result.count;
    const duped = records.length - inserted;
    total += inserted;
    totalSkipped += duped;
    if (inserted > 0) {
      console.log(`  ✓ ${phase.label.padEnd(20)} ${String(inserted).padStart(5)} imported` + (duped > 0 ? ` (${duped} dupes skipped)` : ''));
    } else {
      console.log(`  ~ ${phase.label.padEnd(20)} ${String(duped).padStart(5)} skipped (all duplicates)`);
    }
  }

  console.log(`\n  ─────────────────────────────────────────`);
  console.log(`  Imported: ${total}   Skipped: ${totalSkipped}`);
  console.log('  ─────────────────────────────────────────\n');
}

async function main() {
  const existingCount = await prisma.book.count();

  if (existingCount > 0) {
    console.log(`Database already has ${existingCount} books — skipping seed to preserve production data.\n`);
    console.log('To force re-seed, run: npx prisma db seed -- --force');
    return;
  }

  const hasExportFile = fs.existsSync(EXPORT_FILE);

  if (hasExportFile) {
    console.log('Full export file detected — importing all data\n');
    await seedFromExport();
  } else {
    await seedStatic();
  }

  const stats = {
    moods: await prisma.mood.count(),
    books: await prisma.book.count(),
    bookMoods: await prisma.bookMood.count(),
    users: await prisma.user.count(),
    bookChapters: await prisma.bookChapter.count(),
    bookSummaries: await prisma.bookSummary.count(),
  };

  console.log('Database seeding complete:');
  console.log(`  Moods:        ${stats.moods}`);
  console.log(`  Books:        ${stats.books}`);
  console.log(`  Mood assign.: ${stats.bookMoods}`);
  console.log(`  Users:        ${stats.users}`);
  console.log(`  Chapters:     ${stats.bookChapters}`);
  console.log(`  Summaries:    ${stats.bookSummaries}`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());