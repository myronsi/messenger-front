# API contract and runtime version checks

The frontend is built against the released contract package
[`@myronsi/messenger-api`](https://www.npmjs.com/package/@myronsi/messenger-api) (published by
`messenger-back`). It contains `openapi.yaml`, the WebSocket event types (`ws-events.d.ts`) and
`API_VERSION`.

## Using the package

- The dependency is pinned to an exact version (`npm i -E @myronsi/messenger-api@<version>`).
- `npm run generate:api` generates `src/shared/api/generated/schema.d.ts` from the package's
  `openapi.yaml`. The generated file is committed; CI regenerates it and fails if it differs.
- `npm run check:contract` verifies the pin is exact and matches the lockfile.
  `npm run check:contract -- --stable` additionally rejects `next` snapshots. CI runs it on `main` and the release build runs it before building,
  so releases only use stable contracts.
- WebSocket event types come from `@myronsi/messenger-api/ws-events`.
- Today the generated types are used for `/meta` and the `hello` event. The chat screens still use handwritten models for the legacy Python routes; they move to the generated types together with the v2 migration, so `tsc` only guards those parts once that is done.

### Updating the contract

- A new stable version arrives as a Dependabot PR (group `api-contract`). CI regenerates the
  types and runs `tsc` and the smoke tests, so a contract change that does not fit the frontend
  fails the PR.
- Unreleased backend features: on a feature branch, install the `next` tag
  (`npm i -E @myronsi/messenger-api@next`). Replace it with a stable version before merging.
- After changing the pin, update `scripts/backend-version` to the backend release that
  implements it. The smoke tests in CI start that backend version.

## Mock backend

`npm run dev:mock` (same as `VITE_API_MOCK=true`) starts [Prism](https://stoplight.io/open-source/prism)
from the contract and points the frontend at it, so UI work can start before the backend
endpoint exists. WebSocket events are not mocked. Prism serves the v2 contract paths (`/me`, `/chats`, `/groups`, ...); screens that still call the legacy Python routes (for example `/auth/me`, `/chats/list/{username}`) get "route not found" until they are migrated to the v2 API.

## Client version headers

Every request to the backend, including the WebSocket ticket request and uploads, carries:

| Header | Value |
| --- | --- |
| `X-Client-Version` | the app version (`package.json`) |
| `X-Client-Api-Version` | the contract version the client was generated from |

By default the contract version is `API_VERSION` from the package. `VITE_CLIENT_API_VERSION`
overrides it. The Python backend implements contract `1.0.0`, so builds served by it must set
`VITE_CLIENT_API_VERSION=1.0.0`. The release build does this through the repository variable `VITE_CLIENT_API_VERSION` (default `1.0.0`); set the variable to the new contract version when production moves to the Go backend. The smoke tests also default to `1.0.0`.

## Outdated clients and new deployments

| Signal | Result |
| --- | --- |
| `426` with `code: "client_outdated"` | blocking dialog with a **Reload** button |
| WebSocket `hello`, or `/api/v2/meta` on tab focus (at most every 5 minutes): backend `api_version` is newer | non-blocking banner "Update available" |
| `min_client_api_version` is higher than the client's contract version | blocking dialog |
| `vite:preloadError` (lazy chunk missing after a deploy) | reload once |

Unsent message drafts (including the first message to a new contact) are kept in `sessionStorage`, per account and conversation, and restored after the reload. Text of a message that is being edited is not stored. Drafts are removed when the tokens are cleared (sign-out, failed refresh, or sign-out in another tab).

In the native (Capacitor) apps a reload cannot update the bundled assets, so the dialog and banner tell the user to install the update from the app store instead of offering **Reload**. In the browser, **Reload** first waits (up to a few seconds) for a new service worker to take control, so the reload loads the new build.

The focus check calls `/api/v2/meta` relative to `VITE_BASE_URL` (the host root, an `/api` prefix, or an `/api/v2` base all work). The Python backend's `GET /version` has no API version fields, so the check only works with the Go backend. `hello` and `426` work with both.

## Tolerant client

MINOR contract updates must not break the client:

- unknown response fields are ignored;
- unknown WebSocket event types are ignored (`parseServerEvent` maps them to `unknown`);
- unknown enum values fall back to the least privileged or neutral value (for example an
  unknown group role is shown as a member and has no permissions).

## Hosting

`deploy/nginx/cache-headers.conf` serves `index.html`, the service worker and the manifest with
`Cache-Control: no-cache`, and hashed assets with
`Cache-Control: public, max-age=31536000, immutable`.

## Local backend and smoke tests

`npm run backend:up [tag]` (`scripts/backend-up.sh`) downloads `deploy/compose.stack.yaml` from
the matching backend release (or `master`) and starts the backend with all stores from Docker
images on `http://127.0.0.1:8000`. The default tag is in `scripts/backend-version` (currently `master`, because the first backend release that accepts the client version headers is not published yet; switch it to that release afterwards).
`scripts/backend-up.sh down` removes it.

`npm run test:smoke` runs the Playwright suite in `e2e/smoke` (register, sign in, open a chat,
send and receive a message between two browser contexts, upload a file) against `E2E_API_URL`
(default `http://127.0.0.1:8000`). Test data is created by the tests. CI runs it on every PR
against the backend version in `scripts/backend-version` and nightly against backend `master`.
The backend's compatibility job runs the same suite, so keep it stable.