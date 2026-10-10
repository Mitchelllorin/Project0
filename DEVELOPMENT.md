# Developing this locally

Everything here is about running the studio on **your own machine**. For handing a
finished instance to a client, see [DEPLOY.md](DEPLOY.md); for the catalogue format,
[backend/CATALOG.md](backend/CATALOG.md).

You need **no accounts, no API keys and no cloud services** — MongoDB runs locally and
the app talks only to itself.

## What you need

| Tool | Version | Notes |
|---|---|---|
| Node.js | **20 or newer** | Declared in `frontend/package.json` (`engines`). 24 is what this repo is developed on. |
| Yarn | **1.22** | Pinned in `packageManager`; `corepack enable` installs it for you. `npm install` also works. |
| Python | **3.11 – 3.12** | 3.12 is used here. |
| MongoDB | **6 or 7** | Docker (easiest), a local server, or any reachable `mongodb://` URL — including a hosted one. |

## Get the code

```bash
git clone <your repo URL> kitchen-studio
cd kitchen-studio
```

Confirm what changed around you any time with `./dev.sh check` (below).

## 1. MongoDB

Docker, one command:

```bash
docker compose up -d mongo
```

No Docker? Install MongoDB yourself and point `backend/.env` at it. macOS:
`brew tap mongodb/brew && brew install mongodb-community && brew services start mongodb-community`.
Linux: install `mongodb-org` and `systemctl start mongod`. Windows: the MSI installer,
running as a service. Any of these gives you `mongodb://127.0.0.1:27017`.

## 2. Backend — port 8001

```bash
cd backend
cp .env.example .env                      # required: server.py reads MONGO_URL, DB_NAME, CORS_ORIGINS at import
python3 -m venv .venv
source .venv/bin/activate                 # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
python -m uvicorn server:app --reload --port 8001
```

Use `requirements-dev.txt` (it includes `requirements.txt` plus pytest). If you are
behind a proxy or the MongoDB CLI tools need a CA bundle, set those in your shell, not in
the repo.

## 3. Frontend — port 3000

In a second terminal:

```bash
cd frontend
cp .env.example .env                      # REACT_APP_BACKEND_URL=http://localhost:8001
corepack enable                           # or: npm install -g yarn@1.22.22
yarn install --frozen-lockfile
yarn start
```

Open <http://localhost:3000>.

CRA bakes `REACT_APP_BACKEND_URL` in at **start** time, so restart the dev server after
changing `frontend/.env`.

## Or let the script do it

```bash
./dev.sh          # Mongo (via Docker) + backend + frontend, Ctrl-C stops all three
./dev.sh check    # report this machine's toolchain, .env files, ports and installs
./dev.sh install  # create the .env files and install both dependency sets, start nothing
```

`dev.sh` is bash — on Windows use WSL2, or copy the commands above into two PowerShell
windows. `check` changes nothing; it is the fastest way to find out why a step failed.

## Prove your setup works

```bash
# the API and what this install is configured as
curl localhost:8001/api/            # {"name":"Kitchen Studio Assembly API",...}
curl localhost:8001/api/deployment  # brand + the catalog it ships with
curl localhost:8001/api/catalogs    # every catalog, and whether it renders

# backend contract tests — 55 of them, against a LIVE backend, hence the env var
cd backend && REACT_APP_BACKEND_URL=http://localhost:8001 pytest -q

# frontend tests — 48 of them, no backend needed
cd frontend && CI=true yarn test --watchAll=false

# types
cd frontend && npx tsc --noEmit
```

Then in the browser: select a cabinet, explode it, *Share* the design, and open
*Quote → Download BOM*. That path covers geometry, persistence and the sales outputs.

**Why `REACT_APP_BACKEND_URL` matters for pytest:** the backend suite is an API suite. It
talks to a running server rather than importing the app, so without that variable it
fails with connection errors even though your code is fine.

## Developing the deployment identity and branding

An instance is branded and pointed at a catalog by environment variables, not code:

```bash
cd backend
BRAND_NAME="Northline Cabinetry" BRAND_ACCENT="#4f8cff" DEFAULT_CATALOG=northline-example \
  python -m uvicorn server:app --reload --port 8001
```

The studio is branded from `GET /api/deployment` at boot, and from
`REACT_APP_BRAND_*` / `REACT_APP_DEFAULT_CATALOG` when the bundle is built. Precedence,
the full variable list and the client handoff are in [DEPLOY.md](DEPLOY.md).

## Layout

```
backend/
  server.py         FastAPI app and routes            tests/            pytest suites
  recipe.py         catalogue-driven rules engine     catalog/          one JSON per manufacturer
  deployment.py     this install's brand + catalog     CATALOG.md        catalogue schema
  layout.py         room layouts, dimensions, quote
  assembly.py       parts and machining                models.py, conftest.py, pytest.ini
frontend/src/studio/
  Studio.jsx        the app shell and pages           StudioContext.jsx  state, save/share, config
  Viewport.jsx      3D scene, camera, explode         engine.ts          typed assembly math
  deployment.js     deployment identity + precedence  pointer.js         tap-vs-drag for touch
  device.js         render budget per device          palette.js         theming
  share.js          share-link encode/decode          BrandPage/QuotePage/Controls/Inspector
  *.test.ts         Jest suites next to the modules they cover
DEPLOY.md · DEVELOPMENT.md · README.md
```

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| Backend exits immediately | `backend/.env` is missing. `cp .env.example .env`. |
| `No matching distribution found for emergentintegrations` | You installed the wrong file. Use `requirements-dev.txt`; the published `requirements.txt` was already trimmed to what the app imports. |
| *"The studio could not connect"* in the UI | The API is down, or `frontend/.env` points somewhere else. Check `REACT_APP_BACKEND_URL`, that the API is on 8001, and that `CORS_ORIGINS` includes `http://localhost:3000`. |
| pytest fails with connection errors | Export `REACT_APP_BACKEND_URL=http://localhost:8001` — the suite drives a live server. |
| `Unknown catalog 'x'` (400) | The name must be a JSON file in `backend/catalog/`; `curl localhost:8001/api/catalogs` lists them and says why any is invalid. |
| A catalogue edit has no effect | Catalogues are cached in the process — restart the API. |
| `yarn: command not found` | `corepack enable`, or `npm install -g yarn@1.22.22`. |
| Install fails fetching `@emergentbase/*` from `assets.emergent.sh` | Those two are dev-server editor tooling (a branded error overlay and a visual-edit bridge) fetched from a vendor CDN, and nothing in a production build uses them. `./dev.sh install` retries without them automatically and puts `package.json` and `yarn.lock` back afterwards. By hand: drop both from `frontend/package.json`, install, then restore the file — the studio builds and runs without them, printing two warnings, with the overlay off. Note that declaring them `optionalDependencies`, or installing with `--ignore-optional`, does **not** help: yarn v1 still exits non-zero when a URL dependency is unreachable (both measured). |
| The build or dev server is killed (exit 137) | Out of RAM. The separate TypeScript checker worker is the expensive part: `DISABLE_TS_CHECKER=true yarn build` (or `yarn start`), and cap the heap with `NODE_OPTIONS=--max-old-space-size=1024`. Types are still checked with `npx tsc --noEmit`. |
| Port already in use | `lsof -i :3000` / `:8001` / `:27017`, or start on another port and update `.env`. |
| Mongo connection refused | `docker compose up -d mongo`, or start your own `mongod`. |

## Continuous integration

`.github/workflows/verify.yml` runs this same path on every push and pull request —
`./dev.sh install`, the API contract tests against a real MongoDB service container,
`tsc`, the unit tests and a production build. It is deliberately one job using the
developer's own script, so a green tick means the documented path works.

## Notes

- **`.env` files are gitignored.** They hold local addresses, never secrets; keep them
  that way and never commit one.
- **`frontend/build` is a build artefact**, gitignored, and recreated by `yarn build`.
- The dev server and the production image are different worlds: the image serves the
  bundle through nginx and answers on one origin. See [DEPLOY.md](DEPLOY.md).
