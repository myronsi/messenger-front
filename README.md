# Messenger Application

This project is a simple web-based messenger application designed for sending and receiving real-time messages using a client-server architecture. It includes a web client interface and a Python-based server for handling connections, user authentication, and message storage.

---

## Table of Contents
- [Features](#features)
- [Technologies Used](#technologies-used)
- [Installation](#installation)
- [Usage](#usage)
- [Project Structure](#project-structure)

---

## Features
- Real-time messaging using WebSocket.
- User authentication and session management.
- Message storage in a lightweight SQLite database.
- RESTful API for user and chat management.
- Simple and responsive web-based client interface.

---

## Technologies Used
- **Frontend**: React, TypeScript
- **Backend**: Python (FastAPI, SQLite, WebSocket)
- **Database**: SQLite

---

## Installation

### Clone Git-Repository
`git clone https://github.com/myronsi/messenger.git`

### Change directory
`cd messenger`


### Launch python virtual environment
`python -m venv .`

### Activate python virtual environment
#### macOS/Linux
`source bin/activate`

### Install dependencies

#### Arch Linux
`sudo pacman -S python`<br>
`pip install -r requirements.txt`

#### Debian/Ubuntu
`sudo apt update`<br>
`sudo apt install python3 python3-pip`<br>
`pip3 install -r requirements.txt`

#### macOS
`brew install python`<br>
`pip3 install -r requirements.txt`

### Install npm (in client directory only)

`npm i`<br>
or<br>
`npm i --legacy-peer-deps`<br>

This project uses npm only: `package-lock.json` is the single lock file (CI runs `npm ci --legacy-peer-deps`), so do not commit `bun.lockb`, `yarn.lock` or `pnpm-lock.yaml`.

### Configure the frontend

> **Branch `v2`** ports the app to the Go backend (API contract v2, issues F26–F30). `main` keeps
> talking to the Python backend until the switch; `v2` is merged into it then.

Copy `.env.example` to `.env.local`. `VITE_API_URL` is the API root of the Go backend:

```env
VITE_API_URL=http://127.0.0.1:8080/api/v2
```

`npm run backend:up` starts that backend with all its stores from Docker images (see
[docs/api-contract.md](docs/api-contract.md#local-backend-and-smoke-tests)). The WebSocket connects to
`VITE_API_URL` with `ws://` or `wss://`; set `VITE_WS_URL` only when it is hosted elsewhere. The v1
variable `VITE_BASE_URL` (the host root, an `/api` prefix or the `/api/v2` root) is still accepted.

### Install as a mobile app

The frontend is an installable PWA (add to home screen) and can be packaged as a native Android/iOS app with Capacitor. See [docs/mobile.md](docs/mobile.md).

## Usage

### Change your app.js file

at first line change `const BASE_URL = "http://ip:8000";` to yours ip addres

### Launch python virtual environment
`python -m venv .`

### Activate python virtual environment
#### macOS/Linux
`source bin/activate`

### Launch server
`uvicorn server.main:app --host 0.0.0.0 --port 8000`

### View swagger api
`http://your_ip:8000/docs#/`

### View messenger
run `npm run dev` (in client directory)


## Project Structure

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

## Versioning and releases

This project follows Semantic Versioning and Conventional Commits. See [docs/versioning.md](docs/versioning.md) for the scheme and [docs/releasing.md](docs/releasing.md) for the release checklist.

The API layer is generated from the released contract package; see [docs/api-contract.md](docs/api-contract.md) for the mock backend (`npm run dev:mock`), local backend (`npm run backend:up`), smoke tests and outdated-client handling.

