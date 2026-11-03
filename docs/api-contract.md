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
- The supported backend is Go at `/api/v2`; Python routes are retired.

### Updating the contract

- A new stable version arrives as a Dependabot PR (group `api-contract`). CI regenerates the
  types and runs `tsc` and the smoke tests, so a contract change that does not fit the frontend
  fails the PR.
- Unreleased backend features: on a feature branch, install the `next` tag
  (`npm i -E @myronsi/messenger-api@next`). Replace it with a stable version before merging.
- After changing the pin, update `scripts/backend-version` to the backend release that
  implements it. The smoke tests in CI start that backend version.
- `scripts/backend-up.sh` starts Go release tags from their matching deployment bundle, including stores and
  migrations. It exports the v2 URL and pinned client contract to GitHub smoke jobs. Nightly tests use `go-master`; Python tags are rejected. No production credentials are used by these test stacks.

## Mock backend

`npm run dev:mock` (same as `VITE_API_MOCK=true`) starts [Prism](https://stoplight.io/open-source/prism)
from the contract and points the frontend at it, so UI work can start before the backend
endpoint exists. WebSocket events are not mocked. Prism serves the v2 contract paths (`/me`, `/chats`, `/groups`, ...).

## Client version headers

Every request to the backend, including the WebSocket ticket request and uploads, carries:

| Header | Value |
| --- | --- |
| `X-Client-Version` | the app version (`package.json`) |
| `X-Client-Api-Version` | the contract version the client was generated from |

By default the contract version is `API_VERSION` from the package. `VITE_CLIENT_API_VERSION`
overrides it only when explicitly configured. Release builds otherwise use the pinned package contract.

## Outdated clients and new deployments

| Signal | Result |
| --- | --- |
| `426` with `code: "client_outdated"` | blocking dialog with a **Reload** button |
| `version.json` on tab focus (at most every 5 minutes) names a different build than the running one | non-blocking banner "Update available" |
| Native app only: WebSocket `hello` or `/api/v2/meta` reports a newer backend `api_version` | non-blocking banner "update in the app store" |
| `min_client_api_version` is higher than the client's contract version | blocking dialog |
| `vite:preloadError` (lazy chunk missing after a deploy) | reload once |

A newer backend `api_version` alone does not show the banner in the browser: the backend contract often moves ahead of the deployed frontend, and a reload would load the same build again. **Later** stores the offered version in `localStorage` (`dismissed_update`), so the banner stays hidden after a reload until a different build is offered.

Unsent message drafts (including the first message to a new contact) are kept in `sessionStorage`, per account and conversation, and restored after the reload. Text of a message that is being edited is not stored. Drafts are removed when the tokens are cleared (sign-out, failed refresh, or sign-out in another tab).

In the native (Capacitor) apps a reload cannot update the bundled assets, so the dialog and banner tell the user to install the update from the app store instead of offering **Reload**. In the browser, **Reload** first waits (up to a few seconds) for a new service worker to take control, so the reload loads the new build.

The focus check calls `/api/v2/meta` relative to `VITE_BASE_URL` (the host root, an `/api` prefix, or an `/api/v2` base all work). The Go backend supplies the API version fields.

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

`npm run backend:up -- [tag]` starts the Go deployment bundle with matching migrations and isolated stores. The default release is pinned in `scripts/backend-version`; `go-master` and `go-sha-<sha>` snapshots are also supported. Python tags are rejected. The API is at `http://127.0.0.1:8000/api/v2`.

`scripts/backend-up.sh down` removes the local test stack. `npm run test:smoke` runs Playwright against `E2E_API_URL`. CI tests the pinned backend on pull requests and the `go-master` snapshot nightly. The backend compatibility job runs the same suite against its Go development stack.
