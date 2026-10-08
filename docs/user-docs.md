# User documentation (`/docs`)

The user help page at `https://messenger.viserix.com/docs` is a route of the web app itself, not a separate site.

## How it is deployed

Nothing extra is needed: it ships with every release.

- `src/app/App.tsx` routes `/docs` to `src/pages/docs` before the messenger catch-all, so it opens whether or not the user is signed in.
- The page is lazy-loaded, so it does not grow the main bundle.
- nginx already serves `index.html` for unknown paths (`try_files $uri /index.html` in `deploy/nginx/cache-headers.conf`), and the PWA service worker uses the same navigation fallback, so `/docs` works on a direct visit, on reload and offline.
- The normal release flow (`release-please` -> `deploy.yml`) publishes content changes; there is no separate deploy step.

Links to the page: the sign-in screen footer and Profile -> About -> "Help & docs".

## Editing the content

The text lives in `src/shared/lang/en/docs.ts` and `src/shared/lang/ru/docs.ts`.

- `docs.sections` are the how-to sections; each `id` is the URL anchor (for example `/docs#groups`), so keep ids stable and identical in both languages.
- `docs.upcoming` is the "Upcoming features" list. Remove an item when the feature ships. Section and upcoming icons are mapped by `id` in `src/pages/docs/model/docsIcons.ts`.
- "What's new" is generated at build time from `CHANGELOG.md` (`src/pages/docs/model/parseChangelog.ts`): the latest 5 releases, only the Features, Bug Fixes and Performance Improvements sections, with scopes, links and duplicate entries removed. The entries come from Conventional Commit messages, so write `feat`/`fix`/`perf` PR titles that make sense to users. Entries are English in both languages.
- Use the same button and menu labels as the app (see the other files in `src/shared/lang`).
- `src/pages/docs/DocsPage.test.tsx` checks that both languages have the same sections and upcoming items.

The page reuses the app's look (the profile panel shell, card sections and icon tiles), so keep new UI in the same style.
