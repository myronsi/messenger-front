import { MENTION_ALL } from '@/shared/lib/mentions';

const QUERY = /(^|[^A-Za-z0-9_@])@([A-Za-z0-9_]{0,32})$/;
export const MAX_MENTION_SUGGESTIONS = 6;

export interface MentionCandidate {
  username: string;
  display_name?: string;
  avatar_url?: string;
}

export interface MentionQuery {
  query: string;
  start: number;
}

export type MentionSuggestion = MentionCandidate & { all?: boolean };

export const mentionQuery = (value: string, caret: number): MentionQuery | null => {
  const match = QUERY.exec(value.slice(0, caret));
  if (!match) return null;
  return { query: match[2], start: caret - match[2].length - 1 };
};

const words = (text: string) => text.toLowerCase().split(/\s+/).filter(Boolean);

export const suggestMentions = (members: MentionCandidate[], query: string, self: string, canMentionAll: boolean): MentionSuggestion[] => {
  const needle = query.toLowerCase();
  const others = members.filter((member) => member.username.toLowerCase() !== self.toLowerCase());
  const rank = (member: MentionCandidate) => {
    const username = member.username.toLowerCase();
    if (username.startsWith(needle)) return 0;
    const display = member.display_name || '';
    if (words(display).some((word) => word.startsWith(needle))) return 1;
    if (username.includes(needle) || display.toLowerCase().includes(needle)) return 2;
    return 3;
  };
  const seen = new Set<string>();
  const ranked = others
    .map((member) => ({ member, score: rank(member) }))
    .filter(({ member, score }) => score < 3 && !seen.has(member.username.toLowerCase()) && !!seen.add(member.username.toLowerCase()))
    .sort((a, b) => a.score - b.score)
    .map(({ member }) => member);
  const all: MentionSuggestion[] = canMentionAll && MENTION_ALL.startsWith(needle) ? [{ username: MENTION_ALL, display_name: '', all: true }] : [];
  return [...all, ...ranked].slice(0, MAX_MENTION_SUGGESTIONS);
};

export const applyMention = (value: string, caret: number, at: MentionQuery, username: string) => {
  const insert = `@${username} `;
  return { value: value.slice(0, at.start) + insert + value.slice(caret), caret: at.start + insert.length };
};
