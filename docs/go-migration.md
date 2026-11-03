# Completed Go migration

Status recorded on 2026-11-03: production and staging use the Go backend. The frontend cutover was completed on 2026-11-01; Python retirement was completed on 2026-11-03. There is no supported Python rollback deployment. The historical migration procedure remains in Git history.

## Current connections

| Environment | HTTP API | WebSocket API base |
| --- | --- | --- |
| Local backend helper | `http://127.0.0.1:8000/api/v2` | `ws://127.0.0.1:8000/api/v2` |
| Staging | `https://staging.messenger.viserix.com/api/v2` | `wss://staging.messenger.viserix.com/api/v2` |
| Production | `https://messenger.viserix.com/api/v2` | `wss://messenger.viserix.com/api/v2` |

The client obtains a single-use ticket and connects to the Go `/api/v2/ws` endpoint. Keep `/api/v2` in both build settings. Production bundles have production API addresses, so staging must use its own build. Automatic staging deployment runs on every push to `main`; production follows releases. See [releasing](releasing.md).

## What remains in the frontend

`src/shared/api/goTransport.ts` translates existing screen requests to the v2 contract, and `goModels.ts` maps responses into screen models. These adapters remain necessary after the server migration. Their older internal request names do not mean a Python service is still running. Non-v2 transport code is not a supported way to restore the retired backend.

Server IDs remain strings through routes, state, caches and events. Negative numeric IDs represent local optimistic messages; zero represents a draft chat. Protected media uses authenticated requests and temporary object URLs. Uploads create attachments before messages or avatar changes reference them. Tokens must not be put in media URLs.

## Accounts and sessions

Existing accounts continue to sign in. The Go backend retains verification of migrated password hashes and upgrades them on successful login. Removing this compatibility would lock out existing users; it is separate from retaining the Python runtime.

Refresh cookies must reach `/api/v2/auth/refresh`. The old `/api/auth` cookie path caused refresh to fail when the 15-minute access token expired; it was corrected on 2026-11-03. A browser holding only the old cookie needs a fresh sign-in. Do not extend access-token lifetime to mask a refresh failure.

Account recovery now uses a saved recovery key, with an authenticator or backup code when required. New registrations show the key once. Existing users can create one in Security & devices using their current credentials. Successful recovery issues a replacement key, signs out existing sessions, and temporarily restricts security-method changes. Old recovery shares/QR parts do not replace this key. Keys stay out of browser storage.

## Validation

Use the standard checks from the [README](../README.md). Local CI smoke tests start the pinned Go backend; nightly tests use `go-master`. The staging suite is for synthetic test accounts only:

```sh
E2E_API_URL=https://staging.messenger.viserix.com/api/v2 npx playwright test --config playwright.staging.config.ts
```

The command above uses Bash-style environment assignment. The suite covers registration/sign-in, recovery, sessions, chats, groups, permissions and media; some cases require dedicated fixtures. `GO_TEST_USER_A`, `GO_TEST_PASSWORD_A`, `GO_TEST_USER_B`, `GO_TEST_PASSWORD_B`, `GO_SECURITY_FIXTURE` and `GO_LEGACY_USERNAME`/`GO_LEGACY_PASSWORD` must refer to disposable staging accounts. Security and recovery tests mutate those accounts. Keep fixture credentials outside the repository and never point this suite at production.

## Related records

- Backend [completed cutover](https://github.com/myronsi/messenger-back/blob/master/docs/switchover.md), [data migration](https://github.com/myronsi/messenger-back/blob/master/docs/migration-v1.md), and [Python retirement](https://github.com/myronsi/messenger-back/blob/master/docs/python-retirement.md).
- Migration PRs: [backend #131](https://github.com/myronsi/messenger-back/pull/131), [frontend #122](https://github.com/myronsi/messenger-front/pull/122).
- Retirement PRs: [backend #150](https://github.com/myronsi/messenger-back/pull/150), [frontend #139](https://github.com/myronsi/messenger-front/pull/139).
