# Project Zero — Kitchen Studio Visualizer

A brandable 3D kitchen configurator and per-fastener assembly / explode engine
(Phase 0 pitch demo).

- **Frontend** — React 19 + Create React App (via `@craco/craco`) + react-three-fiber / Three.js
- **Backend** — FastAPI + Pydantic + Motor (MongoDB)

```
frontend/   React studio UI (port 3000)
backend/    FastAPI assembly/quote API (port 8001)
```

## Catalogs — adding a manufacturer

Catalog **data** (dimensions, thicknesses, joinery, hardware, edge banding,
labels, price rates) is kept separate from the assembly **rules engine**
(`backend/recipe.py`). A manufacturer is onboarded by writing one JSON document
in `backend/catalog/`; the engine resolves it into parts, machining, edge banding
and pricing with no code change.

- `backend/catalog/euro32.json` — the shipped generic Euro / 32 mm frameless template.
- `backend/catalog/northline-example.json` — a worked onboarding example.
- **`backend/CATALOG.md`** — the schema and the three-step onboarding process.

```bash
curl localhost:8001/api/catalogs     # list catalogs + onboarding status
curl -X POST localhost:8001/api/configure -H 'Content-Type: application/json' \
     -d '{"catalog":"northline-example","layout":"straight"}'
```

`recipe.validate_catalog()` is the machine-checkable contract and is covered by
`backend/tests/test_catalog_engine.py`, alongside golden part-count tests that
lock the shipped geometry.

## Mobile / touch

The studio is built phone-first for the 3D viewport:

- **App shell** — `100dvh` plus `env(safe-area-inset-*)`, so the canvas, dock and
  status bar stay on screen behind a notch or home indicator, in portrait and
  landscape. Short viewports (landscape phones) compress the chrome instead of
  forcing a taller-than-screen shell.
- **The viewport is a drag surface** — orbit/pinch never scroll or pull-to-refresh
  the page, a drag that begins on a cabinet no longer selects it, and long-press
  text selection is disabled (`src/studio/pointer.js`).
- **Tap, not double-click** — touch gets an explicit *Assembly* action, because
  double-click is unreachable with a finger. Hover highlights are suppressed for
  touch pointers so a highlight never sticks.
- **Render budget** (`src/studio/device.js`) — phones drop the DPR clamp to 1.25,
  the shadow map to 1024 and the environment probe to 64: the three costs that
  dominate a frame on a mobile GPU.

Both thresholds and the tap/drag discrimination are pure functions with unit
tests (`src/studio/device.test.ts`, `src/studio/pointer.test.ts`).

## Local development

### Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | >= 20 | `frontend/package.json` targets Node 20+ |
| Yarn | 1.22 | Declared as `packageManager`; enable with `corepack enable` |
| Python | 3.11–3.12 | |
| MongoDB | 6 or 7 | Either Docker (recommended) or a local `mongod` |

### 1. Start MongoDB

With Docker:

```bash
docker compose up -d mongo
```

Without Docker, run a local server instead (any install works):

```bash
mongod --dbpath ./data/db --port 27017
```

### 2. Backend (port 8001)

```bash
cd backend
cp .env.example .env            # adjust if your Mongo lives elsewhere
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
python -m uvicorn server:app --reload --port 8001
```

`.env` is required — `server.py` reads `MONGO_URL`, `DB_NAME` and
`CORS_ORIGINS` at import time and will not start without them.

### 3. Frontend (port 3000)

In a second terminal:

```bash
cd frontend
cp .env.example .env            # REACT_APP_BACKEND_URL=http://localhost:8001
corepack yarn install           # (or: npm install)
corepack yarn start
```

Open <http://localhost:3000>.

CRA bakes `REACT_APP_BACKEND_URL` in at start time, so restart the dev server
after changing `frontend/.env`.

### Convenience script

`./dev.sh` does the Mongo + backend + frontend startup above in one step
(see the script for the exact commands it runs).

## Tests

Backend API tests run against a **live** backend and read its URL from
`REACT_APP_BACKEND_URL`:

```bash
cd backend
REACT_APP_BACKEND_URL=http://localhost:8001 pytest
```

Runtime + test dependencies are split so a plain
`pip install -r requirements.txt` no longer fails: the original generated list
included packages that are not imported by the app (and
`emergentintegrations==0.2.2`, which is not published on PyPI).

### Remote / preview dev server

When the dev server runs somewhere other than your machine (a cloud VM, a
preview host), the browser can't reach the backend on its own `localhost`.
Two optional env flags on `yarn start` handle that:

```bash
REACT_APP_BACKEND_URL= DEV_PROXY_TARGET=http://127.0.0.1:8001 DISABLE_TS_CHECKER=true yarn start
```

- `DEV_PROXY_TARGET` — proxies same-origin `/api/*` from the dev server to the
  backend, so set `REACT_APP_BACKEND_URL=` (empty) and the app calls `/api`.
- `DISABLE_TS_CHECKER` — skips the separate TypeScript type-checker worker
  processes, which cut peak memory roughly in half (useful on low-RAM VMs).

Both are opt-in and have no effect on a normal local `yarn start`.

## Ports

| Service | Port |
|---|---|
| Frontend dev server | 3000 |
| Backend API | 8001 |
| MongoDB | 27017 |

## Known local-dev gotchas

- **`No matching distribution found for emergentintegrations`** — fixed here by
  trimming `backend/requirements.txt` to the dependencies the backend actually
  imports. Use `requirements-dev.txt` for tests.
- **Studio says "The studio could not connect"** — the backend isn't reachable.
  Check `frontend/.env` has `REACT_APP_BACKEND_URL=http://localhost:8001`, the
  backend is on 8001, and its `CORS_ORIGINS` includes your frontend origin.
- **Backend exits immediately** — `backend/.env` is missing. Copy
  `backend/.env.example`.
