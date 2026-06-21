import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { BookEpisodes, LangCode, MultilingualText, RichChapter } from '@/lib/groq';
import { makeMultilingualText } from '@/lib/groq';
import { getBookContent, getBookTranslation, upsertBookTranslation } from '@/services/bookService';
import type { BookContent } from '@/services/bookService';
import { translateField } from '@/lib/i18n/translate-pipeline';

const VALID_LANGS: LangCode[] = ['ar', 'fr', 'en', 'de'];

function mt(val: unknown): MultilingualText {
  if (val && typeof val === 'object' && !Array.isArray(val) && 'ar' in val) {
    return { ...makeMultilingualText(''), ...(val as unknown as MultilingualText) };
  }
  return makeMultilingualText(typeof val === 'string' ? val : '', 'en');
}

async function translateFieldTo(
  field: MultilingualText | string | null | undefined,
  targetLang: LangCode,
  context?: string,
): Promise<MultilingualText> {
  if (!field || typeof field === 'string') {
    const result: MultilingualText = { ar: '', fr: '', en: '', de: '' };
    const text = typeof field === 'string' ? field : '';
    if (text) {
      const translatedText = await translateField(text, targetLang, context);
      if (translatedText) result[targetLang] = translatedText;
    } else {
      result.en = '';
    }
    return result;
  }

  const result: MultilingualText = { ...field };
  if (result[targetLang] && result[targetLang].trim()) return result;

  const sourceLang: LangCode =
    result.en?.trim() ? 'en' :
    result.ar?.trim() ? 'ar' :
    result.fr?.trim() ? 'fr' :
    result.de?.trim() ? 'de' :
    'en';

  const sourceText = result[sourceLang];
  if (!sourceText || !sourceText.trim()) return result;

  const translatedText = await translateField(sourceText, targetLang, context);
  if (translatedText) result[targetLang] = translatedText;
  return result;
}

async function translateArrayTo(
  arr: MultilingualText[] | null | undefined,
  targetLang: LangCode,
): Promise<MultilingualText[]> {
  if (!arr || !Array.isArray(arr)) return [];
  return Promise.all(arr.map((item) => translateFieldTo(item, targetLang)));
}

async function buildTranslation(
  bookId: string,
  source: BookContent,
  targetLang: LangCode,
): Promise<{
  content: BookEpisodes;
  title: string;
  author: string;
  category: string;
}> {
  const bookData: BookEpisodes = {
    title: mt(source.episodes?.title ?? source.title),
    author: source.author || 'AI Generated',
    category: source.category || 'General',
    tagline: mt(source.episodes?.tagline ?? source.tagline),
    description: source.description || '',
    coverPrompt: source.coverPrompt || '',
    relatedBooks: mt(source.episodes?.relatedBooks),
    deepExplanation: mt(source.episodes?.deepExplanation),
    finalSummary: mt(source.episodes?.finalSummary ?? source.finalSummary),
    mainConcepts: mt(source.episodes?.mainConcepts ?? source.mainConcepts),
    keyLessons: ((source.episodes?.keyLessons as unknown[] | undefined) || (source.keyLessons as unknown[] | undefined) || []).map((l: unknown) => mt(l)),
    keyInsights: ((source.episodes?.keyInsights as unknown[] | undefined) || (source.keyInsights as unknown[] | undefined) || []).map((i: unknown) => mt(i)),
    implementationGuide: mt(source.episodes?.implementationGuide ?? source.implementationGuide),
    episodes: source.chapters?.length > 0
      ? source.chapters.map((ch) => ({
          number: typeof ch.number === 'number' ? ch.number : 0,
          title: mt(ch.title),
          hook: mt(ch.hook),
          content: mt(ch.content),
          keyIdeas: mt(ch.keyIdeas),
          actionableTips: mt(ch.actionableTips),
          importantQuotes: mt(ch.importantQuotes),
          practicalExamples: mt(ch.practicalExamples),
          keyTakeaway: mt(ch.keyTakeaway),
          cliffhanger: mt(ch.cliffhanger),
          summary: mt(ch.summary),
          wordCount: typeof ch.wordCount === 'number' ? ch.wordCount : 300,
        }))
      : (source.episodes?.episodes as RichChapter[]) || [],
  };

  const needsTranslation = targetLang !== 'en';

  if (!needsTranslation) {
    const rawTitle = source.episodes?.title
      ? (typeof source.episodes.title === 'object'
        ? ((source.episodes.title as Record<string, string>).en || source.title)
        : source.title)
      : source.title;
    return {
      content: bookData,
      title: typeof rawTitle === 'string' ? rawTitle : String(rawTitle || ''),
      author: source.author || 'AI Generated',
      category: source.category || 'General',
    };
  }

  const translated: BookEpisodes = {
    ...bookData,
    title: await translateFieldTo(bookData.title, targetLang, 'Book title'),
    tagline: await translateFieldTo(bookData.tagline, targetLang, 'Book tagline'),
    relatedBooks: await translateFieldTo(bookData.relatedBooks, targetLang, 'Related books'),
    deepExplanation: await translateFieldTo(bookData.deepExplanation, targetLang, 'Deep explanation'),
    finalSummary: await translateFieldTo(bookData.finalSummary, targetLang, 'Final summary'),
    mainConcepts: await translateFieldTo(bookData.mainConcepts, targetLang, 'Main concepts'),
    implementationGuide: await translateFieldTo(bookData.implementationGuide, targetLang, 'Implementation guide'),
    keyLessons: await translateArrayTo(bookData.keyLessons, targetLang),
    keyInsights: await translateArrayTo(bookData.keyInsights, targetLang),
    episodes: await Promise.all(
      (bookData.episodes || []).map(async (ep, idx) => {
        const prefix = `Chapter ${ep.number || idx + 1}`;
        return {
          ...ep,
          title: await translateFieldTo(ep.title, targetLang, `${prefix} title`),
          hook: await translateFieldTo(ep.hook, targetLang, `${prefix} hook`),
          content: await translateFieldTo(ep.content, targetLang, `${prefix} content`),
          keyIdeas: await translateFieldTo(ep.keyIdeas, targetLang, `${prefix} key ideas`),
          actionableTips: await translateFieldTo(ep.actionableTips, targetLang, `${prefix} tips`),
          importantQuotes: await translateFieldTo(ep.importantQuotes, targetLang, `${prefix} quotes`),
          practicalExamples: await translateFieldTo(ep.practicalExamples, targetLang, `${prefix} examples`),
          keyTakeaway: await translateFieldTo(ep.keyTakeaway, targetLang, `${prefix} takeaway`),
          cliffhanger: await translateFieldTo(ep.cliffhanger, targetLang, `${prefix} cliffhanger`),
          summary: await translateFieldTo(ep.summary, targetLang, `${prefix} summary`),
        };
      }),
    ),
  };

  const translatedTitle = translated.title[targetLang] || bookData.title.en || source.title;

  return {
    content: translated,
    title: translatedTitle,
    author: source.author || 'AI Generated',
    category: source.category || 'General',
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: { slug?: string; targetLang?: string } = await request.json();

    if (!body.slug) {
      return NextResponse.json({ error: 'slug is required' }, { status: 400 });
    }

    const targetLang = (body.targetLang || 'en') as LangCode;
    if (!(VALID_LANGS as readonly string[]).includes(targetLang)) {
      return NextResponse.json(
        { error: `Invalid targetLang. Must be one of: ${VALID_LANGS.join(', ')}` },
        { status: 400 },
      );
    }

    const book = await prisma.book.findUnique({ where: { slug: body.slug } });
    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    const existing = await getBookTranslation(book.id, targetLang);
    if (existing) {
      return NextResponse.json({
        bookId: book.id,
        slug: book.slug,
        language: targetLang,
        title: existing.title,
        author: existing.author,
        category: existing.category,
        content: existing.content,
        cached: true,
      });
    }

    const source = await getBookContent(body.slug);
    if (!source) {
      return NextResponse.json({ error: 'Book content not found' }, { status: 404 });
    }

    const { content, title, author, category } = await buildTranslation(book.id, source, targetLang);

    await upsertBookTranslation(book.id, targetLang, title, author, category, content);

    return NextResponse.json({
      bookId: book.id,
      slug: book.slug,
      language: targetLang,
      title,
      author,
      category,
      content,
      cached: false,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[TranslateGenerate] Error:', message);
    return NextResponse.json(
      { error: 'Translation generation failed', _debug: process.env.NODE_ENV === 'development' ? message : undefined },
      { status: 500 },
    );
  }
}
