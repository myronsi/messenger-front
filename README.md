# Messenger frontend

React, TypeScript and Vite web client, installable as a PWA and packaged for Android/iOS with Capacitor. The supported backend is [messenger-back](https://github.com/myronsi/messenger-back), implemented in Go with API base `/api/v2`. The Python migration is complete.

## Local setup

Use Node 22 and npm. `package-lock.json` is the only lockfile.

```sh
git clone https://github.com/myronsi/messenger-front.git
cd messenger-front
npm ci --legacy-peer-deps
npm run backend:up
```

The backend helper requires Docker Compose and Bash. It starts the pinned Go image, migrations and isolated stores; no Python or Go compiler is needed. On Windows use a Bash-capable environment with Docker available. Keep backend source checkouts separate from this repository.

Create `.env.local`:

```env
VITE_BASE_URL=http://127.0.0.1:8000/api/v2
VITE_WS_URL=ws://127.0.0.1:8000/api/v2
```

```sh
npm run dev
```

Open the local URL printed by Vite. To use a separately running Go development stack, set both URLs to its address, typically port 8080. Preserve the `/api/v2` base. `VITE_CLIENT_API_VERSION` normally stays unset so the pinned contract supplies it.

Stop the disposable backend with `bash scripts/backend-up.sh down`; this removes its local test data. `npm run backend:up -- go-master` selects the latest Go snapshot. Python `v0.*`, `master` and `sha-*` image tags are retired. See [API contract and backend testing](docs/api-contract.md).

## Checks

```sh
npm run check:contract
npm run typecheck
npm run lint
npm test
npm run build
npm run test:smoke
```

Smoke tests need the local backend. They create synthetic users and data; use isolated test environments. `npm run dev:mock` serves the HTTP contract through Prism; it does not mock WebSocket delivery.

## Deployment and documentation

- Every push to `main` automatically builds and deploys [staging](https://staging.messenger.viserix.com/) with staging API addresses.
- Production frontend deployment follows a release. Deploy a compatible backend before a dependent frontend release.
- The in-app [help page](https://messenger.viserix.com/docs) ships with the frontend; English and Russian content lives in `src/shared/lang/*/docs.ts`.
- [Releasing and rollback](docs/releasing.md), [versioning](docs/versioning.md), [mobile setup](docs/mobile.md), and [notifications](docs/notifications.md).
- [Completed Go migration](docs/go-migration.md) explains current transport and account compatibility; the backend [retirement record](https://github.com/myronsi/messenger-back/blob/master/docs/python-retirement.md) documents archived data and removed infrastructure.

## Project structure

### Frontend conventions

- Keep `index.ts` and `index.tsx` files as public barrels containing only re-exports; keep them at 30 lines or fewer.
- Keep frontend source files below 300 lines. Split larger files by responsibility rather than by arbitrary line ranges.
- Put business logic, hooks, and pure helpers in `.ts` files; keep `.tsx` files focused on rendering and pass explicit, typed props to child views.
- Use shared context or the existing API/data layer for genuinely shared state instead of threading it through unrelated components.

```text
src/
├── app/          # Application setup, routes, store, and API wiring
├── pages/        # Route-level screens and page controllers
├── widgets/      # User-facing compositions such as chat room and profile panel
├── features/     # Focused user actions and workflows
├── entities/     # Domain models, types, and entity APIs
└── shared/       # Reusable UI, hooks, utilities, localization, and styles
```

Layers may only import from layers below them (`app` > `pages` > `widgets` > `features` > `entities` > `shared`). Slices of the same layer in `pages`, `widgets` and `features` must not import each other, and other slices are only reachable through their public API (`index` file). These rules are enforced by `eslint-plugin-boundaries` (see `eslint.config.js`) and checked by `npm run lint`.
