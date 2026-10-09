export type ChangeKind = 'features' | 'fixes' | 'performance';

export interface ChangelogRelease {
  version: string;
  date: string | null;
  changes: Record<ChangeKind, string[]>;
}

// Only user-facing release-please sections are shown; chores, refactors, docs etc. are skipped.
const SECTION_KINDS: Record<string, ChangeKind> = {
  'features': 'features',
  'bug fixes': 'fixes',
  'performance improvements': 'performance',
};

const RELEASE_HEADING = /^##\s+\[?([^\]\s]+)\]?(?:\([^)]*\))?(?:\s+\((\d{4}-\d{2}-\d{2})\))?/;
const SECTION_HEADING = /^###\s+(.+?)\s*$/;
const ENTRY = /^\*\s+(.+)$/;

// "**chat:** make it faster ([#12](...)) ([abc123](...)), closes [#7](...)" -> "Make it faster"
export const cleanChangelogEntry = (entry: string) => {
  const text = entry
    .replace(/,\s*closes\s+\[[^\]]*\]\([^)]*\)(?:,\s*\[[^\]]*\]\([^)]*\))*\s*$/i, '')
    .replace(/(?:\s*\(\[[^\]]*\]\([^)]*\)\))+\s*$/, '')
    .replace(/^\*\*[^*]+:\*\*\s*/, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
};

export const parseChangelog = (markdown: string, limit = 5): ChangelogRelease[] => {
  const releases: ChangelogRelease[] = [];
  let release: ChangelogRelease | null = null;
  let kind: ChangeKind | null = null;

  for (const line of markdown.split(/\r?\n/)) {
    const releaseMatch = line.match(RELEASE_HEADING);
    if (releaseMatch) {
      release = { version: releaseMatch[1].replace(/^v/, ''), date: releaseMatch[2] ?? null, changes: { features: [], fixes: [], performance: [] } };
      releases.push(release);
      kind = null;
      continue;
    }
    const sectionMatch = line.match(SECTION_HEADING);
    if (sectionMatch) {
      kind = SECTION_KINDS[sectionMatch[1].toLowerCase()] ?? null;
      continue;
    }
    const entryMatch = line.match(ENTRY);
    if (!release || !kind || !entryMatch) continue;
    const text = cleanChangelogEntry(entryMatch[1]);
    if (text && !release.changes[kind].includes(text)) {
      release.changes[kind].push(text);
    }
  }

  return releases
    .filter(({ changes }) => changes.features.length + changes.fixes.length + changes.performance.length > 0)
    .slice(0, limit);
};
