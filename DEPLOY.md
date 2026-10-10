# Deploying a client's instance

One instance is one client. It is a branded studio, its API and its own database —
three containers, started by one command, configured entirely by `.env`. Standing up a
manufacturer or distributor is therefore a configuration exercise, never a code change:

```
catalog/<their>.json   →  what their cabinets are made of
.env                   →  what their instance is called and which catalogue it ships
```

This document is the handoff guide. The catalogue format itself lives in
[`backend/CATALOG.md`](backend/CATALOG.md).

---

## 1. What runs

| Container | Image | Role | Reachable from |
|---|---|---|---|
| `web` | nginx (built from `frontend/`) | serves the studio bundle, proxies `/api` | the internet, on `$PORT` |
| `api` | FastAPI (built from `backend/`) | geometry, catalogue, quote, project storage | only `web` |
| `mongo` | `mongo:7` | saved designs | only `api` |

Only `web` publishes a port. The browser therefore talks to a single origin — no CORS
preflight, and no backend hostname baked into the bundle.

**Requirements:** Docker Engine 24+ with the Compose v2 plugin, 2 vCPU, 2 GB RAM, 10 GB
disk. Node, Yarn, Python and MongoDB are **not** needed on the client's machine — the
build happens inside the image, and it pulls nothing but the public npm and Docker
registries: the two `@emergentbase/*` editor packages that `frontend/package.json`
declares for the dev server are dropped during the image build, because they are fetched
from a vendor CDN and a production build never uses them.

## 2. Quick start

```bash
cp .env.prod.example .env     # then edit the branding and the public origin
./deploy.sh up                # builds both images and starts the stack
./deploy.sh doctor            # checks the machine, the config and the running instance
```

Then open `http://<host>:$PORT`. `./deploy.sh` with no argument lists every command.

## 3. Configuration — `.env`

| Variable | Default | What it does |
|---|---|---|
| `PUBLIC_ORIGIN` | `http://localhost:8080` | The origin clients open. Used for the API's CORS allow-list. |
| `PORT` | `8080` | Host port `web` publishes. |
| `DB_NAME` | `kitchen_studio` | Database name. One per instance. |
| `BRAND_NAME` | *(the neutral default)* | Studio name, shown in the header, the page title and saved quotes. |
| `BRAND_SUBTITLE` | *(the neutral default)* | The line under it. |
| `BRAND_ACCENT` | `#dca55e` | Accent colour, `#rrggbb`. Drives buttons, highlights and the quote. |
| `BRAND_LOGO_URL` | *(none)* | Logo, **HTTPS only** (a mixed-content logo would be silently blocked by the browser). |
| `DEFAULT_CATALOG` | `euro32` | The catalogue document this instance configures from. |

Every value is optional and every value is validated: a typo'd accent or an
`http://` logo is logged at startup and dropped, and an unknown or unrenderable
`DEFAULT_CATALOG` falls back to `euro32` with a warning rather than breaking the studio.
Nothing here is a secret, so `.env` may be handed to the client — but it is gitignored,
so a client's instance never leaks back into the repository.

## 4. Branding — why it is set in two places

The same values are read twice, on purpose:

| Where | When | Why |
|---|---|---|
| Build arguments on the `web` image | at `./deploy.sh up` | Baked into the bundle, so the **very first paint is already the client's brand** — no flash of the vendor's name. |
| Environment on the `api` container | at every start | Served at `GET /api/deployment`, so an instance can be **re-branded without rebuilding** the bundle. |

To change a client's branding:

```bash
$EDITOR .env
./deploy.sh rebrand     # api re-reads .env: instant, no rebuild, brief flash on first paint
./deploy.sh up          # rebuilds the bundle too: slower, but flash-free
```

The studio adopts whichever branding it has, in this order of precedence: **a design the
visitor opened from a share link → branding they saved on this browser → the
deployment's branding → the built-in default.** A dealer putting their own name on a
proposal is a feature, so their choice wins; the Branding page offers *Restore studio
identity* to get back to the deployment's.

## 5. Onboarding a manufacturer's catalogue

1. Write `backend/catalog/<name>.json` following [`backend/CATALOG.md`](backend/CATALOG.md).
2. Set `DEFAULT_CATALOG=<name>` in `.env`.
3. `./deploy.sh up`, then confirm it took:

```bash
curl -s localhost:8080/api/catalogs      # every catalog + whether it is renderable
curl -s localhost:8080/api/deployment    # the instance's brand and shipped catalog
```

If the document is incomplete, the API logs exactly what is wrong and the instance falls
back to `euro32` instead of failing every request. `backend/tests/` proves the
data-only onboarding path; the shipped example is `northline-example.json`.

## 6. Day-2 operations

```bash
./deploy.sh logs           # follow both app logs
./deploy.sh ps             # what is running
./deploy.sh doctor         # machine, config, and whether the instance answers
./deploy.sh down           # stop; the database volume is kept
```

**Backups.** Everything durable is in the `mongo-data` volume (saved designs). Back it up
with a throwaway container — no need to stop the instance:

```bash
docker compose -f docker-compose.prod.yml exec mongo \
  mongodump --db "$DB_NAME" --archive=/tmp/backup.gz --gzip
docker compose -f docker-compose.prod.yml cp mongo:/tmp/backup.gz ./backup-$(date +%F).gz
```

**Updating.** `git pull` (or copy in the new source) then `./deploy.sh up` — images are
rebuilt and only what changed is recreated. Data survives.

## 7. TLS and the public origin

`web` speaks plain HTTP on `$PORT`; put it behind whatever terminates TLS the client
already runs, or add a TLS proxy in front:

```caddy
studio.client.example {
    reverse_proxy 127.0.0.1:8080
}
```

Then set `PUBLIC_ORIGIN=https://studio.client.example` in `.env` and `./deploy.sh up`.
nginx already forwards `X-Forwarded-Proto` and `X-Forwarded-For` to the API.

**Do not expose this instance to the internet with no authentication.** The API has no
accounts, roles or rate limiting: anyone who can reach the origin can read and overwrite
a saved design if they know its UUID (a v4 UUID, so not guessable, but not a security
boundary either). For a public deployment put an auth layer — or a manufacturer's own
intranet — in front of it. Signed-in multi-user access is a product feature, not a
deployment flag.

## 8. Verification checklist

After any deployment, in this order:

```bash
./deploy.sh doctor                                  # machine, config, liveness
curl -s localhost:8080/api/deployment               # branding + shipped catalog
curl -s localhost:8080/api/catalogs                 # the catalog is valid:true
curl -s -o /dev/null -w '%{http_code}\n' localhost:8080/          # 200
curl -s -X POST localhost:8080/api/configure \
     -H 'Content-Type: application/json' \
     -d '{"catalog":"<name>","layout":"straight"}'  # 200, cabinets + quote
```

Then in a browser: the header and page title carry the client's name, the logo loads, a
cabinet can be selected and exploded, *Share* produces a link that reopens the same
design, and *Quote → Download BOM* produces a CSV. Those four cover branding, geometry,
persistence and the sales outputs.

## 9. Troubleshooting

| Symptom | Cause and fix |
|---|---|
| `./deploy.sh doctor` says *not answering* | `./deploy.sh ps` then `./deploy.sh logs`. If `api` restarts in a loop, `mongo` is not up yet or `MONGO_URL` was changed. |
| The build is killed (exit 137) | The build host is out of RAM — the separate type-checker worker is the expensive part. Add `DISABLE_TS_CHECKER: "true"` under `web.build.args` in `docker-compose.prod.yml`, or give the host more memory. Types are still checked in CI/development. |
| The studio loads but says it cannot reach the assembly service | `api` is down, or something other than this stack is answering on `$PORT`. Then check `./deploy.sh logs api`. |
| The browser still shows the old brand | A returned visitor's own saved branding wins by design; *Branding → Restore studio identity* returns to the deployment's. If the header is also stale, the bundle was not rebuilt: `./deploy.sh up`. |
| A catalogue edit has no effect | Catalogues are cached in the process — restart the API. |

## 10. What this instance is not

- **Single client.** One origin, one brand, one default catalogue. Serving two
  manufacturers from one instance is a product change, not a config change.
- **No accounts.** See §7.
- **The catalogue is loaded at startup and cached.** After editing a catalogue document,
  restart the API (`./deploy.sh up`) — a warm cache will otherwise keep serving the old
  one.
- **Not branded to the end user's taste everywhere yet.** Surface pricing (countertops,
  finishing), door styles and material swatches are still product data inside the
  engine rather than catalogue data; see the "not yet data" list in `backend/CATALOG.md`.
