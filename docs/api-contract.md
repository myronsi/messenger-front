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
- On the `v2` branch the API layer moves to the generated types screen by screen (F26). Ported so far:
  the version check (`/meta`), the `hello` event, and the account endpoints (register, login with 2FA,
  refresh, logout, recovery). The rest still uses handwritten models until its step lands.
- `src/shared/api/apiUrl.ts` is the only place that knows the API root (`apiUrl('/chats')`), and
  `src/shared/lib/apiError.ts` reads the contract's `application/problem+json` errors:
  `apiErrorMessage(error, fallback)` for people, `apiErrorCode(error)` for decisions.

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
endpoint exists. WebSocket events are not mocked. Prism serves the v2 contract paths at its root, and the
app uses that root as `VITE_API_URL`; screens that still call legacy routes get "route not found" until
they are ported.

## Client version headers

Every request to the backend, including the WebSocket ticket request and uploads, carries:

| Header | Value |
| --- | --- |
| `X-Client-Version` | the app version (`package.json`) |
| `X-Client-Api-Version` | the contract version the client was generated from |

By default the contract version is `API_VERSION` from the package. `VITE_CLIENT_API_VERSION`
overrides it; on `v2` nothing sets it, so the client sends the contract it was built with. (On `main`, served
by the Python backend, the release build sets it to `1.0.0`.)

## Outdated clients and new deployments

| Signal | Result |
| --- | --- |
| `426` with `code: "client_outdated"` | blocking dialog with a **Reload** button |
| WebSocket `hello`, or `/api/v2/meta` on tab focus (at most every 5 minutes): backend `api_version` is newer | non-blocking banner "Update available" |
| `min_client_api_version` is higher than the client's contract version | blocking dialog |
| `vite:preloadError` (lazy chunk missing after a deploy) | reload once |

Unsent message drafts (including the first message to a new contact) are kept in `sessionStorage`, per account and conversation, and restored after the reload. Text of a message that is being edited is not stored. Drafts are removed when the tokens are cleared (sign-out, failed refresh, or sign-out in another tab).

In the native (Capacitor) apps a reload cannot update the bundled assets, so the dialog and banner tell the user to install the update from the app store instead of offering **Reload**. In the browser, **Reload** first waits (up to a few seconds) for a new service worker to take control, so the reload loads the new build.

The focus check calls `GET /meta` under the API root.

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

`npm run backend:up [tag]` (`scripts/backend-up.sh`) starts the Go backend with single-node stores from
Docker images, on `http://127.0.0.1:8080/api/v2` (`BACKEND_PORT` changes the port). It downloads the
backend's own production stack (`deploy/go`) at that version and runs its `deploy.sh`, which migrates and
waits until the API is ready. The tag is a Go release (`v1.0.0-alpha.1`) or a snapshot of backend `master`
(`go-master`, `go-sha-<sha>`); the default is in `scripts/backend-version` (`go-master` until the first Go
release; update it whenever the pinned contract moves). The stack's `.env` with generated secrets stays
in `.backend-stack/go`; `scripts/backend-up.sh down` removes the stack and its data.

`npm run test:smoke` runs the Playwright suite in `e2e/smoke` (register, sign in, open a chat,
send and receive a message between two browser contexts, upload a file) against `E2E_API_URL`
(default `http://127.0.0.1:8080/api/v2`). Test data is created by the tests. CI runs it on every PR
against the backend version in `scripts/backend-version` and nightly against `go-master`. On `v2` the
job may fail without failing the PR until the port is complete (#47).
The backend's compatibility job runs the same suite, so keep it stable.