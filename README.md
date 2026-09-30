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

### Configure the frontend

Create a `.env.local` file with the API server URL:

```env
VITE_BASE_URL=http://localhost:8000
```

The WebSocket endpoint defaults to the same origin as `VITE_BASE_URL`, using `ws://` or `wss://` as appropriate. Set `VITE_WS_URL` only when WebSockets are hosted on a different origin:

```env
VITE_WS_URL=ws://localhost:8000
```

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
run `npm start` (in client directory)


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
