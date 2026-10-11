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

## Deploying a client's instance

One instance is one client: a branded studio, its API and its own database, started by
one command and configured entirely by environment variables.

```bash
cp .env.prod.example .env     # branding, public origin, shipped catalog
./deploy.sh up                # builds and starts web + api + mongo
./deploy.sh doctor            # machine, config and liveness
```

Branding and the shipped catalogue are read twice, on purpose: baked into the bundle at
build time so the first paint is already the client's brand, and served at
`GET /api/deployment` at runtime so an instance can be re-branded without rebuilding.
**`DEPLOY.md`** is the handoff guide — configuration, catalogue onboarding, dealer
accounts, backups, TLS and the post-deploy verification checklist.

## Dealer accounts and trade pricing

One instance is one manufacturer. Its **dealers** are accounts inside that instance: an
access code that resolves to a business, and a trade tier that decides what that business
pays for the parts it orders.

```bash
curl -s -X POST localhost:8001/api/dealer/session \
     -H 'Content-Type: application/json' -d '{"code":"<their code>"}'
curl -s -X POST localhost:8001/api/configure \
     -H 'Content-Type: application/json' -H 'X-Dealer-Code: <their code>' -d '{}'
```

The tier is resolved **on the server, from the code alone** — it is never sent in a request
body, never stored in a design and never carried in a share link, so the same URL costs a
dealer and a homeowner different amounts. A signed-in dealer sees their cost, their margin
and a client price they can discount from list (`price_tier` in the quote); none of that
reaches a printable document. Accounts come from `DEALERS` or a mounted `DEALERS_FILE`, and
revoking one is removing its entry and redeploying. Configured by environment like
everything else — see `DEPLOY.md` § 6, and `backend/tests/test_dealers.py` for the contract.

## Selling it

- **`LICENSE`** — the commercial licence. The software is not open source, and this file is
  what grants a client the right to run it.
- **`PILOT.md`** — the offer sheet, the pilot measurement plan, the outreach message and
  the pricing rationale.

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

**`DEVELOPMENT.md`** is the full setup guide: prerequisites, MongoDB, both servers, the
verification commands and a troubleshooting table. The short version:

```bash
./dev.sh          # MongoDB + backend (8001) + frontend (3000)
./dev.sh check    # what this machine has, and what is missing — changes nothing
```

| Tool | Version |
|---|---|
| Node.js | >= 20 (declared in `frontend/package.json`) |
| Yarn | 1.22 (`corepack enable`) |
| Python | 3.11–3.12 |
| MongoDB | 6 or 7 — Docker (recommended), a local server, or any reachable `mongodb://` URL |

`backend/.env` is required: `server.py` reads `MONGO_URL`, `DB_NAME` and `CORS_ORIGINS` at
import time and will not start without them. `frontend/.env` holds
`REACT_APP_BACKEND_URL`, which CRA bakes in at **start** time — restart the dev server
after changing it. Both are copied from the committed `.env.example` templates.

### Tests

```bash
cd backend  && REACT_APP_BACKEND_URL=http://localhost:8001 pytest -q   # 55 — drives a LIVE backend
cd frontend && CI=true yarn test --watchAll=false                      # 48 — no backend needed
cd frontend && npx tsc --noEmit                                        # clean
```

Runtime and test dependencies are split so a plain `pip install -r requirements.txt`
works on a normal machine: the original generated list included packages the app never
imports, plus `emergentintegrations==0.2.2`, which is not published on PyPI. Use
`requirements-dev.txt` to run the tests.

### Remote / preview dev server

When the dev server runs somewhere other than your machine (a cloud VM, a preview host),
the browser can't reach the backend on its own `localhost`. Two optional env flags on
`yarn start` handle that:

```bash
REACT_APP_BACKEND_URL= DEV_PROXY_TARGET=http://127.0.0.1:8001 DISABLE_TS_CHECKER=true yarn start
```

- `DEV_PROXY_TARGET` — proxies same-origin `/api/*` from the dev server to the
  backend, so set `REACT_APP_BACKEND_URL=` (empty) and the app calls `/api`.
- `DISABLE_TS_CHECKER` — skips the separate TypeScript type-checker worker processes, which
  cut peak memory roughly in half (useful on low-RAM VMs).

Both are opt-in and have no effect on a normal local `yarn start`.

## Ports

| Service | Port |
|---|---|
| Frontend dev server | 3000 |
| Backend API | 8001 |
| MongoDB | 27017 |

Common failures and their fixes are in the troubleshooting table in
[`DEVELOPMENT.md`](DEVELOPMENT.md) — a missing `backend/.env`, an unreachable API, a
killed build, and the rest.
