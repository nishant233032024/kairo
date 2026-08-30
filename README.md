# Kairo

An AI-powered personal productivity studio named for *kairos* — the opportune moment.

Kairo is a full-stack app for tasks, notes, calendar, reminders, semantic search, analytics, and a context-aware assistant. The interface is **black and white**, with grey only for rules and captions.

**Default live model:** NVIDIA NIM `meta/muse-glimmer-30b` at `https://integrate.api.nvidia.com/v1/chat/completions`. Without a reachable model, Node heuristics still run so the product stays usable.

---

## Contents

1. [What it does](#what-it-does)
2. [Architecture](#architecture)
3. [Repository layout](#repository-layout)
4. [Requirements](#requirements)
5. [Local development](#local-development)
6. [Environment variables](#environment-variables)
7. [Demo account](#demo-day)
8. [API overview](#api-overview)
9. [Deploy](#deploy)
10. [Design](#design)
11. [Scripts](#scripts)
12. [Security notes](#security-notes)

---

## What it does

| Area | Behaviour |
| --- | --- |
| Auth | Register, login, logout, profile, password, JWT |
| Tasks | CRUD, priority, deadlines, tags, complete, share / unshare |
| Natural language | “Remind me to prepare for my interview next Friday” → task + date |
| AI rank & plan | Rank open work; day plan; apply blocks to the calendar |
| Notes | Categories, pin, search, tags, AI summarize |
| Calendar | Events + deadlines, ICS export / import, subscribe URL |
| Reminders | Scheduled; Socket.IO toast when due |
| Assistant | Chat with the user’s tasks, notes, reminders; voice in chat |
| Voice bar | Create tasks, search, plan the day, navigate, theme |
| Search | Meaning-oriented search across tasks, notes, documents, reminders |
| Pulse | Completion rate, overdue, weekly / monthly charts |
| Documents | Drag-and-drop; summarize text-like files |
| Studio | Language (en / hi / es), paper / ink theme, PWA install, LLM key |
| PWA | Manifest, service worker, install prompt |

Application flow: **Login → Atelier → Tasks + Notes → Assistant → Plan → Reminders → Pulse**.

---

## Architecture

```
Browser (Vite / React, Socket.IO client)
        │  HTTPS + WebSocket
        ▼
Express API  (JWT, MongoDB, cron reminders)
        │
        ├─► MongoDB Atlas
        ├─► NVIDIA NIM  (meta/muse-glimmer-30b)  [optional]
        └─► FastAPI ai-service  [optional extra LLM layer]
```

The Node process calls NIM directly. FastAPI is optional; if it is down, Kairo still answers with local extractors.

---

## Repository layout

```
kairo/
├── client/                 React (Vite) SPA
│   ├── public/            PWA manifest, icon, service worker
│   ├── src/
│   │   ├── components/    TaskList, Calendar, ChatAssistant, Notes, VoiceBar
│   │   ├── pages/         Auth, Atelier, Planner, Tasks, Notes, …
│   │   ├── services/      api.js, socket.js
│   │   └── App.jsx
│   ├── vercel.json
│   └── .env.example
├── server/                 Express + Socket.IO
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   ├── scripts/           seed, smoke
│   ├── Procfile
│   └── server.js
├── ai-service/             Python FastAPI (optional)
├── docker-compose.yml
├── render.yaml
├── .env.example
└── README.md
```

---

## Requirements

- Node.js **20+**
- MongoDB **7** (local, Docker, or Atlas)
- Optional: Python 3.12 (FastAPI service)
- Optional: NVIDIA API key for Muse Glimmer

---

## Local development

Copy env files (never commit `.env`):

```bash
copy .env.example .env
copy client\.env.example client\.env
```

### MongoDB

```bash
docker compose up mongo -d
```

Or set `MONGODB_URI` to a local / Atlas URI.

### API

```bash
cd server
npm install
npm run dev
```

Health: `http://localhost:5000/api/health`

### Web

```bash
cd client
npm install
npm run dev
```

Open `http://localhost:5173`

### Optional FastAPI

```bash
cd ai-service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

### Full stack with Docker

From the repo root (needs Docker):

```bash
docker compose up --build
```

Then run the Vite client locally against `http://localhost:5000`.

---

## Environment variables

### API (repo root `.env` or host secrets)

| Name | Required in prod | Purpose |
| --- | --- | --- |
| `PORT` | Render sets this | HTTP port |
| `HOST` | no | Bind address (`0.0.0.0` in production) |
| `NODE_ENV` | yes (`production`) | No in-memory Mongo fallback |
| `JWT_SECRET` | yes | Sign access tokens (long random string) |
| `CLIENT_ORIGIN` | yes | SPA origin(s), comma-separated, e.g. `https://kairo.vercel.app` |
| `MONGODB_URI` | yes | Atlas connection string |
| `AI_SERVICE_URL` | no | FastAPI base, e.g. `https://kairo-ai.onrender.com` |
| `NVIDIA_API_KEY` | no | NVIDIA catalog key (`nvapi-…`) |
| `NIM_BASE_URL` | no | Default `https://integrate.api.nvidia.com/v1` |
| `NIM_MODEL` | no | Default `meta/muse-glimmer-30b` |
| `NIM_REASONING_EFFORT` | no | `low` / `medium` / `high` |
| `OPENAI_API_KEY` | no | Alternate provider |
| `GROQ_API_KEY` | no | Alternate provider |

### Client (build-time, Vercel)

| Name | Production example |
| --- | --- |
| `VITE_API_URL` | `https://kairo-api.onrender.com/api` |
| `VITE_SOCKET_URL` | `https://kairo-api.onrender.com` |

Vite inlines these at **build** time. Change them, then redeploy the client.

---

## Demo day

```bash
cd server
npm run seed
```

Login: **Use studio guest**, or `demo@kairo.app` / `kairo123`.

Smoke test (API + client running):

```bash
cd server
npm run smoke
```

---

## API overview

Base: `/api`

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/health` | no | `{ ok, name }` |
| POST | `/auth/register` | no | `{ name, email, password }` |
| POST | `/auth/login` | no | `{ email, password }` |
| GET | `/auth/me` | JWT | |
| PATCH | `/auth/profile` | JWT | |
| POST | `/auth/password` | JWT | |
| POST | `/auth/llm-key` | JWT | Save NIM / OpenAI / Groq key |
| POST | `/auth/llm-key/test` | JWT | Probe the model |
| GET | `/tasks` | JWT | |
| POST | `/ai/create-task` | JWT | Natural language |
| POST | `/ai/chat` | JWT | |
| POST | `/ai/plan` | JWT | |
| POST | `/ai/plan/apply` | JWT | Writes calendar + reminders |
| GET | `/ai/search?q=` | JWT | |
| GET | `/analytics` | JWT | |
| GET | `/calendar/export.ics` | JWT | |
| GET | `/calendar/feed/:token` | no | Subscribe URL |

Socket.IO events (auth handshake `auth.token`): `reminder:due`, `task:updated`, `task:shared`.

---

## Deploy

Recommended: **MongoDB Atlas** + **Render** (API) + **Vercel** (SPA). FastAPI is optional.

### 1. MongoDB Atlas

1. Create a free cluster.
2. Database user + password.
3. Network access: allow Render (or `0.0.0.0/0` for a first deploy).
4. Connection string: `mongodb+srv://USER:PASS@cluster/kairo?retryWrites=true&w=majority`

### 2. API on Render

**Option A — Blueprint**

1. Push this repo to GitHub.
2. Render → **New** → **Blueprint** → select the repo (`render.yaml`).
3. Set `CLIENT_ORIGIN` after the Vercel URL exists (you can temporarily use `*` is **not** supported; use the real `https://….vercel.app`).
4. Set `MONGODB_URI` and `NVIDIA_API_KEY` in the Render dashboard.

**Option B — Manual web service**

- Root directory: `server`
- Build: `npm install`
- Start: `npm start`
- Health: `/api/health`
- Instance: enable WebSockets (default on Render web services)

After the API URL is known, e.g. `https://kairo-api.onrender.com`:

```
CLIENT_ORIGIN=https://YOUR-APP.vercel.app
NODE_ENV=production
JWT_SECRET=<long random>
MONGODB_URI=mongodb+srv://...
NVIDIA_API_KEY=nvapi-...
NIM_MODEL=meta/muse-glimmer-30b
NIM_BASE_URL=https://integrate.api.nvidia.com/v1
```

Uploads on Render’s disk are **ephemeral**. Treat document files as disposable or attach object storage later.

### 3. Client on Vercel

1. Import the GitHub repo.
2. **Root Directory:** `client`
3. Framework: Vite
4. Build: `npm run build`
5. Output: `dist`
6. Environment:

```
VITE_API_URL=https://kairo-api.onrender.com/api
VITE_SOCKET_URL=https://kairo-api.onrender.com
```

7. Deploy, copy the `https://….vercel.app` URL, put it in Render `CLIENT_ORIGIN` (comma-separate preview URLs if needed), then **redeploy the API**.

### 4. Railway (API alternative)

- New service from `server/`
- Start command: `npm start`
- Same env vars as Render
- `Procfile` is `web: node server.js`

### 5. Optional FastAPI on Render

- Root: `ai-service`
- Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Set `AI_SERVICE_URL` on the Node service to this URL (no trailing slash)

### 6. NVIDIA Muse Glimmer

Kairo calls:

`POST {NIM_BASE_URL}/chat/completions`  
`model: meta/muse-glimmer-30b`

Use a key generated from [build.nvidia.com/meta/muse-glimmer-30b](https://build.nvidia.com/meta/muse-glimmer-30b) that is allowed to **invoke** the function. Listing `/v1/models` can succeed while chat hangs or returns 404 if inference is not enabled for the account.

Studio → Language model can store a per-user key. `.env` is the server-wide fallback (`NIM_MODEL` wins for the model id).

---

## Design

- Type: **Fraunces** (display) + **Outfit** (UI)
- Paper `#F4F3EF` / ink `#111111`
- Dark mode inverts the same inks

---

## Scripts

| Where | Command | What |
| --- | --- | --- |
| `server` | `npm run dev` | Watch API |
| `server` | `npm start` | Production API |
| `server` | `npm run seed` | Demo day |
| `server` | `npm run smoke` | HTTP smoke tests |
| `client` | `npm run dev` | Vite |
| `client` | `npm run build` | Production SPA |

---

## Security notes

- Never commit `.env`. Rotate any key that was pasted into chat or a ticket.
- Use a unique `JWT_SECRET` in production.
- Restrict Atlas IP allowlists once Render egress IPs are known.
- CORS is limited to `CLIENT_ORIGIN`; do not leave it as localhost in production.

---

## License

Private / student project unless you add a license file.
