# Translation platform plan

Status: proposal. Nothing on this page is built yet except Spanish, which ships as a third built-in language.

## Goal

Anyone with a Messenger account can translate the app at `languages.messenger.viserix.com`. Translations are stored
in the Messenger database and other users can switch to them without an app release. The model follows the
Telegram translation platform: anyone can create a language pack and own it, packs are shared by link, and the
platform admin verifies the packs that appear in the official language list.

## Roles

| Who | Can do |
| --- | --- |
| Anyone signed in | Suggest translations in any pack and vote on suggestions |
| Pack owner (creator) and co-admins | Approve or reject suggestions, add co-admins, edit the pack name |
| Platform admin | Verify or unverify a pack as official, remove abusive packs, handle reports |

## Safety

- Strings for sign-in, account recovery and security are marked **sensitive**. In an unverified pack they are always
  shown in English, even when translated, so a shared link cannot put phishing text into the recovery screens.
  They switch to the translation only after the admin verifies the pack.
- A translation must keep the placeholders of the English text (`{name}`, `{count}`), must not add HTML, and must not
  add links the English text does not have.
- Length limits per string, rate limits per user, an audit log of approvals, and a report button on every pack.

## Step 1: the app loads languages on demand (frontend only)

- Move the strings from `src/shared/lang/<code>/*.ts` to one JSON file per language. Generate the TypeScript type
  from `en.json`, so a missing or renamed key still fails the typecheck.
- One translate function with `{placeholder}` replacement and plural forms chosen by `Intl.PluralRules`
  (Russian and Spanish have different plural rules from English).
- English stays in the bundle as the fallback. Other packs are downloaded, cached, and later updated with
  "changes since version N". Any string a pack does not have falls back to English.
- English, Russian and Spanish become the first official packs.
- Settings → Language lists the official packs with their completion and links to the translation site.

This step works on its own and can ship before steps 2 and 3.

## Step 2: backend (`messenger-back`, Go)

Tables:

- `language_packs`: code, name, native name, base language, text direction, owner, verified flag, current version
- `language_pack_admins`: pack, user
- `translation_keys`: key, English text, note for translators, sensitive flag, added and removed release
- `translation_suggestions`: pack, key, text, author, status (suggested, approved, rejected), created at
- `translation_votes`: suggestion, user, value
- `translations`: pack, key, approved text, the pack version it changed in

API (in the OpenAPI contract):

- Public: list of official packs, one pack, changes of a pack since a version
- Signed in: create a pack, suggest, vote, report
- Pack owner and co-admins: approve, reject, add or remove co-admins
- Platform admin: verify, unverify, remove, list reports

Source updates: each frontend release uploads `en.json`. New keys are added, removed keys are marked removed, and
keys whose English text changed are marked "needs re-check" in every pack.

## Step 3: translation site (`languages.messenger.viserix.com`)

- Home: official packs and "Create a pack", each with a progress bar
- Editor: English and translation side by side, filters for untranslated, suggestions and changed strings, votes,
  and a live placeholder check
- Pack settings for owners (co-admins, share link) and a verification queue for the platform admin
- Same layout, theme and dark mode as the sign-in pages
- Translators sign in with their Messenger account. Whether the sign-in cookie can be shared with the subdomain is
  still to be checked; if not, the site has its own sign-in page.

## Step 4: in the app and rollout

- Share links: `messenger.viserix.com/language/<name>` asks "Switch to <pack>?" and switches the app
- Settings → Language shows a pack opened by link as "Unofficial"
- Subdomain with nginx and TLS, contract release, then the pull requests in this order:
  1. Frontend: languages on demand (step 1)
  2. Backend and contract (step 2)
  3. Frontend: translation site (step 3), kept as a draft until the contract is published
  4. Deploy configuration for the subdomain

## Later

- Screenshots per string to show where it appears
- Separate string sets per platform (web, Android, iOS)
- Glossary per pack

## Rough size

Step 1 about 1–2 days, step 2 about 4–5 days, step 3 about 3–4 days.
