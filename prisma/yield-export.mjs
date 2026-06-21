import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT = path.join(__dirname, 'yield-export.json');

const prisma = new PrismaClient();

async function main() {
  console.log('┌────────────────────────────────────────────┐');
  console.log('│   BookFlix — Full Database Export          │');
  console.log('└────────────────────────────────────────────┘\n');

  const data = {};

  data.moods = await prisma.mood.findMany({ orderBy: { id: 'asc' } });
  console.log(`  ✓ Moods:              ${String(data.moods.length).padStart(4)}`);

  data.authors = await prisma.author.findMany({ orderBy: { name: 'asc' } });
  console.log(`  ✓ Authors:            ${String(data.authors.length).padStart(4)}`);

  data.books = await prisma.book.findMany({ orderBy: { title: 'asc' } });
  console.log(`  ✓ Books:              ${String(data.books.length).padStart(4)}`);

  data.bookChapters = await prisma.bookChapter.findMany({ orderBy: [{ bookId: 'asc' }, { chapterNumber: 'asc' }] });
  console.log(`  ✓ Book Chapters:      ${String(data.bookChapters.length).padStart(4)}`);

  data.bookSummaries = await prisma.bookSummary.findMany({ orderBy: { bookId: 'asc' } });
  console.log(`  ✓ Book Summaries:     ${String(data.bookSummaries.length).padStart(4)}`);

  data.bookEmbeddings = await prisma.bookEmbedding.findMany({ orderBy: { bookId: 'asc' } });
  console.log(`  ✓ Book Embeddings:    ${String(data.bookEmbeddings.length).padStart(4)}`);

  data.bookMoods = await prisma.bookMood.findMany({ orderBy: [{ bookId: 'asc' }, { moodId: 'asc' }] });
  console.log(`  ✓ Book Moods:         ${String(data.bookMoods.length).padStart(4)}`);

  data.bookCaches = await prisma.bookCache.findMany({ orderBy: { cacheKey: 'asc' } });
  console.log(`  ✓ Book Caches:        ${String(data.bookCaches.length).padStart(4)}`);

  data.bookGenerationJobs = await prisma.bookGenerationJob.findMany({ orderBy: { createdAt: 'asc' } });
  console.log(`  ✓ Generation Jobs:    ${String(data.bookGenerationJobs.length).padStart(4)}`);

  data.apiCaches = await prisma.apiCache.findMany({ orderBy: { cacheKey: 'asc' } });
  console.log(`  ✓ API Caches:         ${String(data.apiCaches.length).padStart(4)}`);

  data.users = await prisma.user.findMany({ orderBy: { email: 'asc' } });
  console.log(`  ✓ Users:              ${String(data.users.length).padStart(4)}`);

  data.userBooks = await prisma.userBook.findMany({ orderBy: [{ userId: 'asc' }, { bookId: 'asc' }] });
  console.log(`  ✓ User Books:         ${String(data.userBooks.length).padStart(4)}`);

  data.userLibraries = await prisma.userLibrary.findMany({ orderBy: [{ userId: 'asc' }, { bookId: 'asc' }] });
  console.log(`  ✓ User Libraries:     ${String(data.userLibraries.length).padStart(4)}`);

  data.userWritingDrafts = await prisma.userWritingDraft.findMany({ orderBy: { createdAt: 'asc' } });
  console.log(`  ✓ Writing Drafts:     ${String(data.userWritingDrafts.length).padStart(4)}`);

  data.analyticsEvents = await prisma.analyticsEvent.findMany({ orderBy: { createdAt: 'asc' } });
  console.log(`  ✓ Analytics Events:   ${String(data.analyticsEvents.length).padStart(4)}`);

  const totalRows = Object.values(data).reduce((sum, arr) => sum + arr.length, 0);

  fs.writeFileSync(OUTPUT, JSON.stringify(data, null, 2), 'utf-8');
  const fileSize = (fs.statSync(OUTPUT).size / 1024 / 1024).toFixed(2);

  console.log(`\n  ─────────────────────────────────────────`);
  console.log(`  Total rows exported:  ${totalRows}`);
  console.log(`  File size:            ${fileSize} MB`);
  console.log(`  Output:               ${OUTPUT}`);
  console.log('  ─────────────────────────────────────────\n');
}

main()
  .catch((err) => {
    console.error('\n✖ Export failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
