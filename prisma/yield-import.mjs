import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INPUT = path.join(__dirname, 'yield-export.json');

const prisma = new PrismaClient();

const MODEL_CONFIG = [
  {
    key: 'moods',
    label: 'Moods',
    model: 'mood',
    uniqueBy: ['id'],
  },
  {
    key: 'authors',
    label: 'Authors',
    model: 'author',
    uniqueBy: ['id'],
  },
  {
    key: 'books',
    label: 'Books',
    model: 'book',
    uniqueBy: ['id'],
  },
  {
    key: 'bookChapters',
    label: 'Book Chapters',
    model: 'bookChapter',
    uniqueBy: ['id'],
  },
  {
    key: 'bookSummaries',
    label: 'Book Summaries',
    model: 'bookSummary',
    uniqueBy: ['id'],
  },
  {
    key: 'bookEmbeddings',
    label: 'Book Embeddings',
    model: 'bookEmbedding',
    uniqueBy: ['id'],
  },
  {
    key: 'bookMoods',
    label: 'Book Moods',
    model: 'bookMood',
    uniqueBy: ['bookId_moodId'],
  },
  {
    key: 'bookCaches',
    label: 'Book Caches',
    model: 'bookCache',
    uniqueBy: ['id'],
  },
  {
    key: 'bookGenerationJobs',
    label: 'Generation Jobs',
    model: 'bookGenerationJob',
    uniqueBy: ['id'],
  },
  {
    key: 'apiCaches',
    label: 'API Caches',
    model: 'apiCache',
    uniqueBy: ['id'],
  },
  {
    key: 'users',
    label: 'Users',
    model: 'user',
    uniqueBy: ['id'],
  },
  {
    key: 'userBooks',
    label: 'User Books',
    model: 'userBook',
    uniqueBy: ['id'],
  },
  {
    key: 'userLibraries',
    label: 'User Libraries',
    model: 'userLibrary',
    uniqueBy: ['id'],
  },
  {
    key: 'userWritingDrafts',
    label: 'Writing Drafts',
    model: 'userWritingDraft',
    uniqueBy: ['id'],
  },
  {
    key: 'analyticsEvents',
    label: 'Analytics Events',
    model: 'analyticsEvent',
    uniqueBy: ['id'],
  },
];

async function main() {
  console.log('┌────────────────────────────────────────────┐');
  console.log('│   BookFlix — Full Database Import          │');
  console.log('└────────────────────────────────────────────┘\n');

  if (!fs.existsSync(INPUT)) {
    console.error(`✖ Export file not found: ${INPUT}`);
    console.error('  Run `node prisma/yield-export.mjs` first.');
    process.exit(1);
  }

  const raw = fs.readFileSync(INPUT, 'utf-8');
  const data = JSON.parse(raw);
  const totalExported = Object.values(data).reduce((sum, arr) => sum + arr.length, 0);
  console.log(`  Loaded export file: ${INPUT}`);
  console.log(`  Total records:      ${totalExported}\n`);

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (const cfg of MODEL_CONFIG) {
    const records = data[cfg.key];
    if (!records || records.length === 0) {
      console.log(`  ○ ${cfg.label.padEnd(20)} 0 records (empty)`);
      continue;
    }

    try {
      const result = await prisma[cfg.model].createMany({
        data: records,
        skipDuplicates: true,
      });
      const inserted = result.count;
      const duped = records.length - inserted;
      imported += inserted;
      skipped += duped;
      if (inserted > 0) {
        console.log(`  ✓ ${cfg.label.padEnd(20)} ${String(inserted).padStart(5)} imported` + (duped > 0 ? ` (${duped} duplicates skipped)` : ''));
      } else {
        console.log(`  ~ ${cfg.label.padEnd(20)} ${String(duped).padStart(5)} skipped (all duplicates)`);
      }
    } catch (err) {
      if (err.code === 'P2002' || (err.message && err.message.includes('unique constraint'))) {
        skipped += records.length;
        console.log(`  ~ ${cfg.label.padEnd(20)} ${String(records.length).padStart(5)} skipped (duplicates)`);
      } else {
        errors++;
        console.error(`  ✖ ${cfg.label.padEnd(20)} FAILED — ${err.message}`);
      }
    }
  }

  console.log(`\n  ─────────────────────────────────────────`);
  console.log(`  Imported:  ${imported}`);
  console.log(`  Skipped:   ${skipped}`);
  console.log(`  Errors:    ${errors}`);
  console.log('  ─────────────────────────────────────────\n');

  if (errors > 0) {
    console.log('  ⚠ Some imports failed. Check errors above.\n');
    process.exit(1);
  }
}

main()
  .catch((err) => {
    console.error('\n✖ Import failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
