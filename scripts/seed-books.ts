/**
 * CLI seed script.
 * Usage: npx tsx scripts/seed-books.ts [--source googlebooks|openlibrary|all] [--output data/seed-books.json]
 */

import { fetchSeedBooks } from '../lib/seed/fetcher';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { getApiSecretKey } from '../lib/auth';

async function main() {
  const args = process.argv.slice(2);
  const sourceFlag = args.findIndex(a => a.startsWith('--source'));
  const source = sourceFlag >= 0 ? args[sourceFlag + 1] || 'all' : 'all';

  const outputFlag = args.findIndex(a => a.startsWith('--output'));
  const outputPath = outputFlag >= 0 ? args[outputFlag + 1] || 'data/seed-books.json' : 'data/seed-books.json';

  const sources = source === 'all'
    ? ['googlebooks' as const, 'openlibrary' as const]
    : [source as 'googlebooks' | 'openlibrary'];

  console.log(`Seeding books from: ${sources.join(', ')}`);
  console.time('seed');

  const result = await fetchSeedBooks({ sources });

  console.timeEnd('seed');
  console.log(`Total books: ${result.total}`);
  console.log(`Google Books: ${result.googleBooks}`);
  console.log(`Open Library: ${result.openLibrary}`);
  console.log(`Duplicates removed: ${result.duplicatesRemoved}`);

  if (result.books.length > 0) {
    const fullPath = join(process.cwd(), outputPath);
    mkdirSync(join(process.cwd(), 'data'), { recursive: true });
    writeFileSync(fullPath, JSON.stringify(result, null, 2), 'utf-8');
    console.log(`Written to: ${fullPath}`);
  }
}

main().catch(console.error);
