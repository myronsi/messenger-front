const MIN_WORD = 2;
const MAX_PREFIX = 10;

export const words = (text: string) =>
  text.normalize('NFKC').toLocaleLowerCase().split(/[^\p{L}\p{N}]+/u).filter((word) => word.length >= MIN_WORD);

export const indexWords = (text: string) => {
  const out = new Set<string>();
  for (const word of words(text)) {
    const chars = [...word];
    for (let length = MIN_WORD; length <= Math.min(chars.length, MAX_PREFIX); length += 1) out.add(chars.slice(0, length).join(''));
  }
  return [...out];
};

export const queryWords = (query: string) => [...new Set(words(query).map((word) => [...word].slice(0, MAX_PREFIX).join('')))];

export const matchesQuery = (text: string, query: string) => {
  const haystack = words(text);
  return words(query).every((word) => haystack.some((candidate) => candidate.startsWith(word)));
};
