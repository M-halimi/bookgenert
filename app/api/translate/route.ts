import { NextRequest, NextResponse } from 'next/server';
import type { BookEpisodes, LangCode, MultilingualText } from '@/lib/groq';
import { translateField } from '@/lib/i18n/translate-pipeline';

const VALID_LANGS: LangCode[] = ['ar', 'fr', 'en', 'de'];

async function translateMtField(
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
    }
    return result;
  }

  const result: MultilingualText = { ...field };

  if (result[targetLang] && result[targetLang].trim()) {
    return result;
  }

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

async function translateMtArray(
  arr: MultilingualText[] | null | undefined,
  targetLang: LangCode,
): Promise<MultilingualText[]> {
  if (!arr || !Array.isArray(arr)) return [];
  return Promise.all(arr.map((item) => translateMtField(item, targetLang)));
}

async function translateBookEpisodes(
  book: BookEpisodes,
  targetLang: LangCode,
): Promise<BookEpisodes> {
  const translated = { ...book };

  translated.title = await translateMtField(
    book.title, targetLang, 'Book title',
  );
  translated.tagline = await translateMtField(
    book.tagline, targetLang, 'Book tagline',
  );
  translated.relatedBooks = await translateMtField(
    book.relatedBooks, targetLang, 'Related books',
  );
  translated.deepExplanation = await translateMtField(
    book.deepExplanation, targetLang, 'Deep explanation',
  );
  translated.finalSummary = await translateMtField(
    book.finalSummary, targetLang, 'Final summary',
  );
  translated.mainConcepts = await translateMtField(
    book.mainConcepts, targetLang, 'Main concepts',
  );
  translated.implementationGuide = await translateMtField(
    book.implementationGuide, targetLang, 'Implementation guide',
  );
  translated.keyLessons = await translateMtArray(book.keyLessons, targetLang);
  translated.keyInsights = await translateMtArray(book.keyInsights, targetLang);

  translated.episodes = await Promise.all(
    (book.episodes || []).map(async (ep, idx) => {
      const prefix = `Chapter ${ep.number || idx + 1}`;
      return {
        ...ep,
        title: await translateMtField(ep.title, targetLang, `${prefix} title`),
        hook: await translateMtField(ep.hook, targetLang, `${prefix} hook`),
        content: await translateMtField(ep.content, targetLang, `${prefix} content`),
        keyIdeas: await translateMtField(ep.keyIdeas, targetLang, `${prefix} key ideas`),
        actionableTips: await translateMtField(ep.actionableTips, targetLang, `${prefix} tips`),
        importantQuotes: await translateMtField(ep.importantQuotes, targetLang, `${prefix} quotes`),
        practicalExamples: await translateMtField(ep.practicalExamples, targetLang, `${prefix} examples`),
        keyTakeaway: await translateMtField(ep.keyTakeaway, targetLang, `${prefix} takeaway`),
        cliffhanger: await translateMtField(ep.cliffhanger, targetLang, `${prefix} cliffhanger`),
        summary: await translateMtField(ep.summary, targetLang, `${prefix} summary`),
      };
    }),
  );

  return translated;
}

export async function POST(request: NextRequest) {
  try {
    const body: { book?: BookEpisodes; targetLang?: string } = await request.json();

    if (!body.book) {
      return NextResponse.json({ error: 'book is required' }, { status: 400 });
    }

    const targetLang = (body.targetLang || 'en') as LangCode;
    if (!(VALID_LANGS as readonly string[]).includes(targetLang)) {
      return NextResponse.json(
        { error: `Invalid targetLang. Must be one of: ${VALID_LANGS.join(', ')}` },
        { status: 400 },
      );
    }

    const translated = await translateBookEpisodes(body.book, targetLang);
    return NextResponse.json(translated);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Translate] Error:', message);
    return NextResponse.json(
      { error: 'Translation failed', _debug: process.env.NODE_ENV === 'development' ? message : undefined },
      { status: 500 },
    );
  }
}
