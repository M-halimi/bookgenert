export function slugify(text: string): string {
  const cleaned = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim();

  const latinized = cleaned
    .replace(/[أإآا]/g, 'a')
    .replace(/[ب]/g, 'b')
    .replace(/[ت]/g, 't')
    .replace(/[ث]/g, 'th')
    .replace(/[ج]/g, 'j')
    .replace(/[ح]/g, 'h')
    .replace(/[خ]/g, 'kh')
    .replace(/[د]/g, 'd')
    .replace(/[ذ]/g, 'dh')
    .replace(/[ر]/g, 'r')
    .replace(/[ز]/g, 'z')
    .replace(/[س]/g, 's')
    .replace(/[ش]/g, 'sh')
    .replace(/[ص]/g, 's')
    .replace(/[ض]/g, 'd')
    .replace(/[ط]/g, 't')
    .replace(/[ظ]/g, 'z')
    .replace(/[ع]/g, 'aa')
    .replace(/[غ]/g, 'gh')
    .replace(/[ف]/g, 'f')
    .replace(/[ق]/g, 'q')
    .replace(/[ك]/g, 'k')
    .replace(/[ل]/g, 'l')
    .replace(/[م]/g, 'm')
    .replace(/[ن]/g, 'n')
    .replace(/[ه]/g, 'h')
    .replace(/[و]/g, 'w')
    .replace(/[يى]/g, 'y')
    .replace(/[ة]/g, 't')
    .replace(/[ئ]/g, 'e')
    .replace(/[ؤ]/g, 'o')
    .replace(/[ء]/g, 'a');

  return latinized
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function formatReadTime(wordCount: number): string {
  const minutes = Math.ceil(wordCount / 200);
  return `${minutes} min`;
}
