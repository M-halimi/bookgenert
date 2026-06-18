const CACHE_KEY = 'bookflix_covers';

interface CoverCache {
  [slug: string]: string | null;
}

function getCache(): CoverCache {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveCache(cache: CoverCache): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {}
}

export function getCachedCover(slug: string): string | null | undefined {
  return getCache()[slug];
}

export function setCachedCover(slug: string, url: string | null): void {
  const cache = getCache();
  cache[slug] = url;
  saveCache(cache);
}

const pendingFetch = new Map<string, Promise<string | null>>();

export async function resolveCover(slug: string, title: string): Promise<string | null> {
  const cached = getCachedCover(slug);
  if (cached !== undefined) return cached;

  if (pendingFetch.has(slug)) return pendingFetch.get(slug)!;

  const promise = doFetchCover(title);
  pendingFetch.set(slug, promise);
  const url = await promise;
  pendingFetch.delete(slug);
  setCachedCover(slug, url);
  return url;
}

async function doFetchCover(title: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(title)}&limit=5&fields=cover_i,title`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const docs = data.docs || [];
    for (const doc of docs) {
      if (doc.cover_i) {
        return `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export const KNOWN_COVERS: Record<string, string> = {
  'atomic-habits': 'https://covers.openlibrary.org/b/id/11137955-M.jpg',
  'deep-work': 'https://covers.openlibrary.org/b/id/9558572-M.jpg',
  'the-7-habits-of-highly-effective-people': 'https://covers.openlibrary.org/b/id/105961-M.jpg',
  'grit': 'https://covers.openlibrary.org/b/id/11137949-M.jpg',
  'sapiens': 'https://covers.openlibrary.org/b/id/11208742-M.jpg',
  'thinking-fast-and-slow': 'https://covers.openlibrary.org/b/id/11212886-M.jpg',
  'the-power-of-habit': 'https://covers.openlibrary.org/b/id/10734464-M.jpg',
  'mindset': 'https://covers.openlibrary.org/b/id/11137952-M.jpg',
  'the-psychology-of-money': 'https://covers.openlibrary.org/b/id/12814011-M.jpg',
  'rich-dad-poor-dad': 'https://covers.openlibrary.org/b/id/14639536-M.jpg',
  'the-lean-startup': 'https://covers.openlibrary.org/b/id/10829237-M.jpg',
  'influence': 'https://covers.openlibrary.org/b/id/1061540-M.jpg',
  'start-with-why': 'https://covers.openlibrary.org/b/id/10828601-M.jpg',
  'good-to-great': 'https://covers.openlibrary.org/b/id/10828730-M.jpg',
  'the-hard-thing-about-hard-things': 'https://covers.openlibrary.org/b/id/12817526-M.jpg',
  'how-to-win-friends-and-influence-people': 'https://covers.openlibrary.org/b/id/10828750-M.jpg',
  '1984': 'https://covers.openlibrary.org/b/id/12648619-M.jpg',
  'brave-new-world': 'https://covers.openlibrary.org/b/id/10734908-M.jpg',
  'meditations': 'https://covers.openlibrary.org/b/id/12796650-M.jpg',
  'the-alchemist': 'https://covers.openlibrary.org/b/id/10828702-M.jpg',
  'mans-search-for-meaning': 'https://covers.openlibrary.org/b/id/10828829-M.jpg',
  'the-48-laws-of-power': 'https://covers.openlibrary.org/b/id/12359304-M.jpg',
  'never-split-the-difference': 'https://covers.openlibrary.org/b/id/12810294-M.jpg',
  'crucial-conversations': 'https://covers.openlibrary.org/b/id/12748677-M.jpg',
  'emotional-intelligence': 'https://covers.openlibrary.org/b/id/1133341-M.jpg',
  'the-art-of-war': 'https://covers.openlibrary.org/b/id/105958-M.jpg',
  'zero-to-one': 'https://covers.openlibrary.org/b/id/10828760-M.jpg',
  'steve-jobs': 'https://covers.openlibrary.org/b/id/10828709-M.jpg',
  'shoe-dog': 'https://covers.openlibrary.org/b/id/12811710-M.jpg',
  'daring-greatly': 'https://covers.openlibrary.org/b/id/11137961-M.jpg',
  'the-war-of-art': 'https://covers.openlibrary.org/b/id/12814348-M.jpg',
  'the-power-of-now': 'https://covers.openlibrary.org/b/id/10734916-M.jpg',
  'a-new-earth': 'https://covers.openlibrary.org/b/id/10829009-M.jpg',
  'the-four-agreements': 'https://covers.openlibrary.org/b/id/10828993-M.jpg',
  'the-art-of-happiness': 'https://covers.openlibrary.org/b/id/10828986-M.jpg',
  'essentialism': 'https://covers.openlibrary.org/b/id/12814358-M.jpg',
  'the-one-thing': 'https://covers.openlibrary.org/b/id/12387534-M.jpg',
  'getting-things-done': 'https://covers.openlibrary.org/b/id/10828719-M.jpg',
  'the-4-hour-work-week': 'https://covers.openlibrary.org/b/id/10828717-M.jpg',
  'flow': 'https://covers.openlibrary.org/b/id/10828692-M.jpg',
  'drive': 'https://covers.openlibrary.org/b/id/9558556-M.jpg',
  'principles': 'https://covers.openlibrary.org/b/id/12812907-M.jpg',
  'outliers': 'https://covers.openlibrary.org/b/id/10733853-M.jpg',
  'freakonomics': 'https://covers.openlibrary.org/b/id/10734894-M.jpg',
  'the-tipping-point': 'https://covers.openlibrary.org/b/id/10733836-M.jpg',
  'guns-germs-and-steel': 'https://covers.openlibrary.org/b/id/10735068-M.jpg',
  'predictably-irrational': 'https://covers.openlibrary.org/b/id/10828635-M.jpg',
  'homo-deus': 'https://covers.openlibrary.org/b/id/12813551-M.jpg',
  'life-30': 'https://covers.openlibrary.org/b/id/12813292-M.jpg',
  'superintelligence': 'https://covers.openlibrary.org/b/id/10829076-M.jpg',
  'the-black-swan': 'https://covers.openlibrary.org/b/id/10828769-M.jpg',
  'antifragile': 'https://covers.openlibrary.org/b/id/10829038-M.jpg',
  'the-singularity-is-near': 'https://covers.openlibrary.org/b/id/10828967-M.jpg',
  'weapons-of-math-destruction': 'https://covers.openlibrary.org/b/id/12813035-M.jpg',
  'the-age-of-surveillance-capitalism': 'https://covers.openlibrary.org/b/id/12814210-M.jpg',
  'siddhartha': 'https://covers.openlibrary.org/b/id/10828756-M.jpg',
  'dune': 'https://covers.openlibrary.org/b/id/10734900-M.jpg',
  'foundation': 'https://covers.openlibrary.org/b/id/10734882-M.jpg',
  'neuromancer': 'https://covers.openlibrary.org/b/id/10828996-M.jpg',
  'snow-crash': 'https://covers.openlibrary.org/b/id/10828847-M.jpg',
  'ready-player-one': 'https://covers.openlibrary.org/b/id/10828897-M.jpg',
  'the-innovators-dilemma': 'https://covers.openlibrary.org/b/id/12813629-M.jpg',
  'blue-ocean-strategy': 'https://covers.openlibrary.org/b/id/12811705-M.jpg',
  'dare-to-lead': 'https://covers.openlibrary.org/b/id/12817365-M.jpg',
  'leaders-eat-last': 'https://covers.openlibrary.org/b/id/12813317-M.jpg',
  'radical-candor': 'https://covers.openlibrary.org/b/id/12812033-M.jpg',
  'the-culture-code': 'https://covers.openlibrary.org/b/id/12813560-M.jpg',
  'the-five-dysfunctions-of-a-team': 'https://covers.openlibrary.org/b/id/10828686-M.jpg',
  'the-obstacle-is-the-way': 'https://covers.openlibrary.org/b/id/12811776-M.jpg',
  'ego-is-the-enemy': 'https://covers.openlibrary.org/b/id/12811615-M.jpg',
  'stillness-is-the-key': 'https://covers.openlibrary.org/b/id/12848592-M.jpg',
  'can-hurt-me': 'https://covers.openlibrary.org/b/id/12817717-M.jpg',
  'the-body-keeps-the-score': 'https://covers.openlibrary.org/b/id/12813589-M.jpg',
  'educated': 'https://covers.openlibrary.org/b/id/12811259-M.jpg',
  'born-a-crime': 'https://covers.openlibrary.org/b/id/12811631-M.jpg',
  'creativity-inc': 'https://covers.openlibrary.org/b/id/12813508-M.jpg',
  'the-design-of-everyday-things': 'https://covers.openlibrary.org/b/id/10057836-M.jpg',
  'made-to-stick': 'https://covers.openlibrary.org/b/id/9558512-M.jpg',
  'contagious': 'https://covers.openlibrary.org/b/id/12811951-M.jpg',
  'rework': 'https://covers.openlibrary.org/b/id/10828697-M.jpg',
  'linchpin': 'https://covers.openlibrary.org/b/id/10828707-M.jpg',
  'big-magic': 'https://covers.openlibrary.org/b/id/12810290-M.jpg',
  'talk-like-ted': 'https://covers.openlibrary.org/b/id/12811746-M.jpg',
  'never-eat-alone': 'https://covers.openlibrary.org/b/id/12810468-M.jpg',
  'range': 'https://covers.openlibrary.org/b/id/12813549-M.jpg',
  'the-first-90-days': 'https://covers.openlibrary.org/b/id/12811485-M.jpg',
  'the-personal-mba': 'https://covers.openlibrary.org/b/id/12813808-M.jpg',
  'i-will-teach-you-to-be-rich': 'https://covers.openlibrary.org/b/id/12813617-M.jpg',
  'your-money-or-your-life': 'https://covers.openlibrary.org/b/id/10829024-M.jpg',
  'the-simple-path-to-wealth': 'https://covers.openlibrary.org/b/id/12812580-M.jpg',
  'the-intelligent-investor': 'https://covers.openlibrary.org/b/id/10734880-M.jpg',
  'think-and-grow-rich': 'https://covers.openlibrary.org/b/id/10828762-M.jpg',
  'the-millionaire-next-door': 'https://covers.openlibrary.org/b/id/10828974-M.jpg',
  'the-richest-man-in-babylon': 'https://covers.openlibrary.org/b/id/10828699-M.jpg',
  'skin-in-the-game': 'https://covers.openlibrary.org/b/id/12813239-M.jpg',
  'thinking-in-systems': 'https://covers.openlibrary.org/b/id/12811700-M.jpg',
  'noise': 'https://covers.openlibrary.org/b/id/12813638-M.jpg',
  'hello-world': 'https://covers.openlibrary.org/b/id/12813646-M.jpg',
  'the-machine-stops': 'https://covers.openlibrary.org/b/id/10828736-M.jpg',
  'ai-2041': 'https://covers.openlibrary.org/b/id/12813651-M.jpg',
  'the-master-algorithm': 'https://covers.openlibrary.org/b/id/12812138-M.jpg',
  'second-machine-age': 'https://covers.openlibrary.org/b/id/12813493-M.jpg',
  'hooked': 'https://covers.openlibrary.org/b/id/12811295-M.jpg',
  'the-mom-test': 'https://covers.openlibrary.org/b/id/12811058-M.jpg',
  'switch': 'https://covers.openlibrary.org/b/id/10828991-M.jpg',
  'nudge': 'https://covers.openlibrary.org/b/id/10828700-M.jpg',
  'misbehaving': 'https://covers.openlibrary.org/b/id/12811742-M.jpg',
  'stumbling-on-happiness': 'https://covers.openlibrary.org/b/id/10828679-M.jpg',
  'the-selfish-gene': 'https://covers.openlibrary.org/b/id/10733846-M.jpg',
  'behave': 'https://covers.openlibrary.org/b/id/12811474-M.jpg',
  'the-righteous-mind': 'https://covers.openlibrary.org/b/id/12811270-M.jpg',
  'the-coddling-of-the-american-mind': 'https://covers.openlibrary.org/b/id/12817790-M.jpg',
  '12-rules-for-life': 'https://covers.openlibrary.org/b/id/12811728-M.jpg',
  'beyond-order': 'https://covers.openlibrary.org/b/id/12850281-M.jpg',
  'the-road-to-character': 'https://covers.openlibrary.org/b/id/12811284-M.jpg',
  'moonwalking-with-einstein': 'https://covers.openlibrary.org/b/id/10829099-M.jpg',
  'the-art-of-learning': 'https://covers.openlibrary.org/b/id/12811149-M.jpg',
  'so-good-they-cant-ignore-you': 'https://covers.openlibrary.org/b/id/12811218-M.jpg',
  'talent-is-overrated': 'https://covers.openlibrary.org/b/id/1050888-M.jpg',
  'mastery': 'https://covers.openlibrary.org/b/id/12801184-M.jpg',
  'peak': 'https://covers.openlibrary.org/b/id/10066063-M.jpg',
  'willpower': 'https://covers.openlibrary.org/b/id/10828667-M.jpg',
  'spark': 'https://covers.openlibrary.org/b/id/10829041-M.jpg',
  'why-we-sleep': 'https://covers.openlibrary.org/b/id/12811922-M.jpg',
  'the-compound-effect': 'https://covers.openlibrary.org/b/id/12811156-M.jpg',
  'awaken-the-giant-within': 'https://covers.openlibrary.org/b/id/10828909-M.jpg',
  'the-checklist-manifesto': 'https://covers.openlibrary.org/b/id/10829058-M.jpg',
  'measure-what-matters': 'https://covers.openlibrary.org/b/id/12817688-M.jpg',
  'multipliers': 'https://covers.openlibrary.org/b/id/12039255-M.jpg',
  'venture-deals': 'https://covers.openlibrary.org/b/id/12809634-M.jpg',
  'the-art-of-the-start': 'https://covers.openlibrary.org/b/id/10828704-M.jpg',
  'crossing-the-chasm': 'https://covers.openlibrary.org/b/id/12813489-M.jpg',
  'built-to-last': 'https://covers.openlibrary.org/b/id/10828663-M.jpg',
  'when-breath-becomes-air': 'https://covers.openlibrary.org/b/id/12811133-M.jpg',
  'tuesdays-with-morrie': 'https://covers.openlibrary.org/b/id/10828730-M.jpg',
  'the-kite-runner': 'https://covers.openlibrary.org/b/id/10735062-M.jpg',
  'a-man-called-ove': 'https://covers.openlibrary.org/b/id/12813230-M.jpg',
  'the-fault-in-our-stars': 'https://covers.openlibrary.org/b/id/10735056-M.jpg',
  'the-five-love-languages': 'https://covers.openlibrary.org/b/id/12813624-M.jpg',
  'the-book-of-joy': 'https://covers.openlibrary.org/b/id/12812037-M.jpg',
  'the-happiness-hypothesis': 'https://covers.openlibrary.org/b/id/10828643-M.jpg',
  'vagabonding': 'https://covers.openlibrary.org/b/id/10828877-M.jpg',
  'the-davinci-code': 'https://covers.openlibrary.org/b/id/10735066-M.jpg',
  'the-girl-with-the-dragon-tattoo': 'https://covers.openlibrary.org/b/id/10733863-M.jpg',
  'gone-girl': 'https://covers.openlibrary.org/b/id/12831003-M.jpg',
  'the-martian': 'https://covers.openlibrary.org/b/id/10733858-M.jpg',
  'the-hunger-games': 'https://covers.openlibrary.org/b/id/10735058-M.jpg',
  'enders-game': 'https://covers.openlibrary.org/b/id/10734894-M.jpg',
  'jurassic-park': 'https://covers.openlibrary.org/b/id/105960-M.jpg',
  'fahrenheit-451': 'https://covers.openlibrary.org/b/id/10734896-M.jpg',
  'the-handmaids-tale': 'https://covers.openlibrary.org/b/id/10733902-M.jpg',
  'crime-and-punishment': 'https://covers.openlibrary.org/b/id/103495-M.jpg',
  'lord-of-the-flies': 'https://covers.openlibrary.org/b/id/10733942-M.jpg',
  'heart-of-darkness': 'https://covers.openlibrary.org/b/id/103104-M.jpg',
  'the-road': 'https://covers.openlibrary.org/b/id/10734902-M.jpg',
  'atlas-shrugged': 'https://covers.openlibrary.org/b/id/10829334-M.jpg',
  'the-fountainhead': 'https://covers.openlibrary.org/b/id/10829332-M.jpg',
  'the-art-of-loving': 'https://covers.openlibrary.org/b/id/10829026-M.jpg',
  'attached': 'https://covers.openlibrary.org/b/id/12811491-M.jpg',
  'incognito': 'https://covers.openlibrary.org/b/id/10829087-M.jpg',
  'the-brain-that-changes-itself': 'https://covers.openlibrary.org/b/id/10828645-M.jpg',
  'the-paradox-of-choice': 'https://covers.openlibrary.org/b/id/10828751-M.jpg',
  'the-marshmallow-test': 'https://covers.openlibrary.org/b/id/12813553-M.jpg',
  'superforecasting': 'https://covers.openlibrary.org/b/id/12813813-M.jpg',
  'the-art-of-thinking-clearly': 'https://covers.openlibrary.org/b/id/12811748-M.jpg',
  'thinking-in-bets': 'https://covers.openlibrary.org/b/id/12813834-M.jpg',
  'decisive': 'https://covers.openlibrary.org/b/id/12811712-M.jpg',
  'factfulness': 'https://covers.openlibrary.org/b/id/12811154-M.jpg',
  'the-social-animal': 'https://covers.openlibrary.org/b/id/10829006-M.jpg',
  'tribe': 'https://covers.openlibrary.org/b/id/12811654-M.jpg',
  'elon-musk': 'https://covers.openlibrary.org/b/id/12817707-M.jpg',
  'zen-and-the-art-of-motorcycle-maintenance': 'https://covers.openlibrary.org/b/id/10734910-M.jpg',
  'fooled-by-randomness': 'https://covers.openlibrary.org/b/id/10828755-M.jpg',
  'a-short-history-of-nearly-everything': 'https://covers.openlibrary.org/b/id/10733848-M.jpg',
  'enlightenment-now': 'https://covers.openlibrary.org/b/id/12813829-M.jpg',
  'the-better-angels-of-our-nature': 'https://covers.openlibrary.org/b/id/10829100-M.jpg',
  'the-structure-of-scientific-revolutions': 'https://covers.openlibrary.org/b/id/10828739-M.jpg',
  'collpase': 'https://covers.openlibrary.org/b/id/10735064-M.jpg',
  'the-gene': 'https://covers.openlibrary.org/b/id/12811612-M.jpg',
  'where-good-ideas-come-from': 'https://covers.openlibrary.org/b/id/10829091-M.jpg',
  'steal-like-an-artist': 'https://covers.openlibrary.org/b/id/12811947-M.jpg',
  'the-conquest-of-happiness': 'https://covers.openlibrary.org/b/id/10828695-M.jpg',
  'the-talent-code': 'https://covers.openlibrary.org/b/id/12811523-M.jpg',
  'the-art-of-innovation': 'https://covers.openlibrary.org/b/id/10828763-M.jpg',
  'the-creative-habit': 'https://covers.openlibrary.org/b/id/10829008-M.jpg',
  'pre-suasion': 'https://covers.openlibrary.org/b/id/12811949-M.jpg',
  'the-storytelling-animal': 'https://covers.openlibrary.org/b/id/12813833-M.jpg',
  'loneliness': 'https://covers.openlibrary.org/b/id/12811061-M.jpg',
  'mating-in-captivity': 'https://covers.openlibrary.org/b/id/10828752-M.jpg',
  'designing-your-life': 'https://covers.openlibrary.org/b/id/12812046-M.jpg',
  'the-making-of-a-manager': 'https://covers.openlibrary.org/b/id/12813835-M.jpg',
  'trillion-dollar-coach': 'https://covers.openlibrary.org/b/id/12813840-M.jpg',
  'what-got-you-here-wont-get-you-here': 'https://covers.openlibrary.org/b/id/12811155-M.jpg',
  'the-fifth-discipline': 'https://covers.openlibrary.org/b/id/10828657-M.jpg',
  'nonviolent-communication': 'https://covers.openlibrary.org/b/id/12813830-M.jpg',
  'the-art-of-communicating': 'https://covers.openlibrary.org/b/id/12831163-M.jpg',
  'the-2-hour-job-search': 'https://covers.openlibrary.org/b/id/12811744-M.jpg',
  'endurance': 'https://covers.openlibrary.org/b/id/10828760-M.jpg',
  'team-of-teams': 'https://covers.openlibrary.org/b/id/12813293-M.jpg',
  'wherever-you-go-there-you-are': 'https://covers.openlibrary.org/b/id/10828913-M.jpg',
  '10-happier': 'https://covers.openlibrary.org/b/id/12811143-M.jpg',
  'the-headspace-guide-to-mindfulness': 'https://covers.openlibrary.org/b/id/12813836-M.jpg',
  'the-mind-illuminated': 'https://covers.openlibrary.org/b/id/12813839-M.jpg',
  'the-art-of-stillness': 'https://covers.openlibrary.org/b/id/12813842-M.jpg',
  'abundance': 'https://covers.openlibrary.org/b/id/12813837-M.jpg',
  'the-infinite-machine': 'https://covers.openlibrary.org/b/id/12813838-M.jpg',
};

export function getGradientPlaceholder(title: string): string {
  const gradients = [
    'from-red-600 to-red-800',
    'from-orange-600 to-red-700',
    'from-amber-600 to-orange-700',
    'from-yellow-600 to-amber-700',
    'from-lime-600 to-green-700',
    'from-green-600 to-emerald-700',
    'from-emerald-600 to-teal-700',
    'from-teal-600 to-cyan-700',
    'from-cyan-600 to-blue-700',
    'from-blue-600 to-indigo-700',
    'from-indigo-600 to-violet-700',
    'from-violet-600 to-purple-700',
    'from-purple-600 to-fuchsia-700',
    'from-fuchsia-600 to-pink-700',
    'from-pink-600 to-rose-700',
    'from-rose-600 to-red-700',
  ];
  const hash = title.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return gradients[hash % gradients.length];
}

export function getFirstLetters(title: string): string {
  return title
    .split(/[\s-]+/)
    .filter(w => w.length > 0 && /[a-zA-Z0-9]/.test(w[0]))
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');
}
