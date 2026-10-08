import { describe, expect, it } from 'vitest';
import changelog from '../../../../CHANGELOG.md?raw';
import { cleanChangelogEntry, parseChangelog } from './parseChangelog';

const sample = `# Changelog

## [1.2.0](https://example.com/compare/v1.1.0...v1.2.0) (2026-10-04)


### Features

* **chat:** add stickers ([#12](https://example.com/issues/12)) ([abc1234](https://example.com/commit/abc1234))
* **chat:** add stickers ([def5678](https://example.com/commit/def5678))


### Bug Fixes

* stop the [list](https://example.com) jumping ([#13](https://example.com/issues/13))


### Miscellaneous Chores

* release 1.2.0 ([#14](https://example.com/issues/14))

## [1.1.1](https://example.com/compare/v1.1.0...v1.1.1) (2026-10-01)


### Miscellaneous Chores

* bump dependencies

## 1.1.0 (2026-09-30)


### Performance Improvements

* load images lazily
`;

describe('cleanChangelogEntry', () => {
  it('drops the scope, the issue and commit links and capitalises the text', () => {
    expect(cleanChangelogEntry('**chat:** add stickers ([#12](https://x/12)) ([abc1234](https://x/abc1234))')).toBe('Add stickers');
  });
});

describe('parseChangelog', () => {
  it('keeps user-facing sections, dedupes entries and skips releases with only chores', () => {
    expect(parseChangelog(sample)).toEqual([
      { version: '1.2.0', date: '2026-10-04', changes: { features: ['Add stickers'], fixes: ['Stop the list jumping'], performance: [] } },
      { version: '1.1.0', date: '2026-09-30', changes: { features: [], fixes: [], performance: ['Load images lazily'] } },
    ]);
  });

  it('limits the number of releases', () => {
    expect(parseChangelog(sample, 1)).toHaveLength(1);
  });

  it('parses the real changelog without leftover markdown', () => {
    const releases = parseChangelog(changelog);
    expect(releases.length).toBeGreaterThan(0);
    for (const { changes } of releases) {
      for (const entry of [...changes.features, ...changes.fixes, ...changes.performance]) {
        expect(entry).not.toMatch(/\]\(|\*\*/);
      }
    }
  });
});
