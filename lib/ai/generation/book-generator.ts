import { getAIService } from '../service';
import {
  BookOutline,
  ChapterOutline,
  GeneratedChapter,
  GeneratedBook,
} from '../types';

interface BookRequest {
  topic: string;
  category?: string;
  style?: string;
  audience?: string;
}

const OUTLINE_SYSTEM_PROMPT = `You are a professional book outline generator. Create a detailed, well-structured book outline based on the given topic.

Your output must be valid JSON only — no markdown, no code fences, no explanation.

Generate exactly 6 chapters. Each chapter must have:
- number: Chapter number (1-6)
- title: A compelling chapter title
- summary: 2-3 sentences explaining what the chapter covers
- estimatedWords: 250-350 (target word count for the chapter)

Output schema:
{
  "title": "Book title",
  "description": "1-2 sentence book description",
  "category": "One of: Mindset | Business | Tech | Science | History | Philosophy | Self-Growth | Fiction",
  "tagline": "A catchy one-line tagline for the book",
  "chapters": [
    {
      "number": 1,
      "title": "Chapter title",
      "summary": "What this chapter covers",
      "estimatedWords": 300
    }
  ]
}`;

const CHAPTER_SYSTEM_PROMPT = `You are an elite book chapter writer. Write engaging, insightful, and well-structured chapter content.

Each chapter must include:
- title: Chapter title
- content: 250-350 words of rich, engaging content (3-5 paragraphs)
- summary: 2-3 sentence recap of what was covered
- keyTakeaway: One clear, actionable insight (1-2 sentences)
- wordCount: Approximate word count

Write with clarity and depth. Use examples, mechanisms, and practical applications.
Avoid generic filler. Every paragraph must add value.

Output valid JSON only — no markdown, no code fences, no explanation.

Schema:
{
  "number": 1,
  "title": "Chapter title",
  "content": "Full chapter content...",
  "summary": "Chapter summary...",
  "keyTakeaway": "Key takeaway...",
  "wordCount": 300
}`;

function extractJSON(text: string): string {
  let cleaned = text.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
  const startIdx = cleaned.indexOf('{');
  const endIdx = cleaned.lastIndexOf('}');
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    cleaned = cleaned.slice(startIdx, endIdx + 1);
  }
  return cleaned;
}

function parseJSON<T>(text: string): T | null {
  try {
    const cleaned = extractJSON(text);
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}

async function generateOutline(request: BookRequest): Promise<BookOutline> {
  const service = getAIService();

  const userPrompt = `Create a book outline for the following topic:

Topic: ${request.topic}
${request.category ? `Category: ${request.category}` : ''}
${request.style ? `Style: ${request.style}` : ''}
${request.audience ? `Target Audience: ${request.audience}` : ''}

Generate exactly 6 chapters with compelling titles and detailed summaries.`;

  const raw = await service.generateWithFallback(userPrompt, OUTLINE_SYSTEM_PROMPT, {
    temperature: 0.7,
    maxTokens: 2048,
  });

  const outline = parseJSON<BookOutline>(raw);

  if (!outline || !outline.chapters || outline.chapters.length === 0) {
    throw new Error('Failed to parse book outline from AI response');
  }

  outline.chapters = outline.chapters
    .map((ch, i) => ({ ...ch, number: i + 1 }))
    .slice(0, 6);

  return outline;
}

async function generateSingleChapter(
  outline: BookOutline,
  chapterOutline: ChapterOutline,
  previousChapters: GeneratedChapter[]
): Promise<GeneratedChapter> {
  const service = getAIService();

  const contextSummary =
    previousChapters.length > 0
      ? `\n\nPreviously written chapters:\n${previousChapters
          .map((ch) => `- Chapter ${ch.number}: ${ch.title} - ${ch.summary}`)
          .join('\n')}`
      : '';

  const userPrompt = `Write chapter ${chapterOutline.number} of the book "${outline.title}".

Chapter Title: ${chapterOutline.title}
Chapter Summary: ${chapterOutline.summary}
Target Word Count: ${chapterOutline.estimatedWords || 300}

Book Description: ${outline.description}
Category: ${outline.category}${contextSummary}

Write engaging, well-structured, and insightful content for this chapter.`;

  const raw = await service.generateWithFallback(userPrompt, CHAPTER_SYSTEM_PROMPT, {
    temperature: 0.8,
    maxTokens: 2048,
  });

  const chapter = parseJSON<GeneratedChapter>(raw);

  if (!chapter || !chapter.content) {
    throw new Error(
      `Failed to parse chapter ${chapterOutline.number} from AI response`
    );
  }

  return {
    number: chapterOutline.number,
    title: chapter.title || chapterOutline.title,
    content: chapter.content,
    summary: chapter.summary || chapterOutline.summary,
    keyTakeaway: chapter.keyTakeaway || '',
    wordCount: chapter.wordCount || chapter.content.split(/\s+/).length,
  };
}

export async function generateBook(
  request: BookRequest
): Promise<GeneratedBook> {
  const startTime = Date.now();

  console.log(`[BookGenerator] Starting book generation for topic: "${request.topic}"`);

  const outline = await generateOutline(request);

  console.log(
    `[BookGenerator] Outline generated: "${outline.title}" with ${outline.chapters.length} chapters`
  );

  const chapters: GeneratedChapter[] = [];

  for (let i = 0; i < outline.chapters.length; i++) {
    const chapterOutline = outline.chapters[i];

    console.log(
      `[BookGenerator] Generating chapter ${chapterOutline.number}/${outline.chapters.length}: "${chapterOutline.title}"`
    );

    const chapter = await generateSingleChapter(outline, chapterOutline, chapters);

    chapters.push(chapter);

    console.log(
      `[BookGenerator] Chapter ${chapter.number} complete: ${chapter.wordCount} words`
    );
  }

  const fullContent = chapters
    .map(
      (ch) =>
        `## Chapter ${ch.number}: ${ch.title}\n\n${ch.content}\n\n`
    )
    .join('');

  const generationTimeMs = Date.now() - startTime;

  console.log(
    `[BookGenerator] Book complete: ${outline.title} | ${chapters.length} chapters | ${generationTimeMs}ms`
  );

  return {
    outline,
    chapters,
    fullContent,
    provider: 'ollama',
    model: process.env.OLLAMA_MODEL || 'llama3',
    generationTimeMs,
  };
}
