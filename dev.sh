#!/usr/bin/env bash
# Start the whole stack for local development: MongoDB + FastAPI (8001) + React (3000).
#
#   ./dev.sh          start everything; Ctrl-C stops the two servers
#   ./dev.sh check    report what this machine has and what is missing — changes nothing
#   ./dev.sh install  install both dependency sets, start nothing
#
# DEVELOPMENT.md has the manual version of every step, plus Windows notes.
set -euo pipefail
cd "$(dirname "$0")"

FRONTEND_PORT=3000
BACKEND_PORT=8001
MONGO_PORT=27017

usage() { sed -n '2,7p' "$0" | sed 's/^# \{0,1\}//'; }
have() { command -v "$1" >/dev/null 2>&1; }
first_line() { "$1" --version 2>/dev/null | head -1; }
port_busy() { { ss -ltn 2>/dev/null || netstat -ltn 2>/dev/null || true; } | grep -qE "[:.]$1[[:space:]]"; }

# Yarn 1.22 is declared in packageManager. Prefer a real yarn; otherwise run that same
# version through corepack, which needs no shims on PATH — 'corepack enable' writes into
# the Node installation and fails on a locked-down machine (it does here).
YARN=""
resolve_yarn() {
  if have yarn; then YARN=yarn
  elif have corepack; then YARN="corepack yarn"
  else YARN=""; fi
  [ -n "$YARN" ]
}

check() {
  local missing=0

  echo "== toolchain =="
  if have node; then echo "node      $(first_line node)   (needs 20+)"
  else echo "node      MISSING — install Node 20 or newer"; missing=1; fi
  if resolve_yarn; then echo "yarn      $($YARN --version 2>/dev/null) (via $YARN)"
  else echo "yarn      MISSING — install Node 20+, which ships corepack"; missing=1; fi
  if have python3; then echo "python3   $(first_line python3)   (needs 3.11 or newer)"
  else echo "python3   MISSING — install Python 3.11 or newer"; missing=1; fi
  if have docker; then
    if docker info >/dev/null 2>&1; then echo "docker    $(first_line docker) — daemon running"
    else echo "docker    installed, but the daemon is NOT running"; fi
  elif have mongod; then echo "mongod    $(first_line mongod) — start it yourself on 127.0.0.1:$MONGO_PORT"
  else echo "mongo     neither docker nor mongod found — one of them is required"; missing=1; fi

  echo
  echo "== this checkout =="
  for template in backend frontend; do
    if [ -f "$template/.env" ]; then echo "$template/.env                     present"
    else echo "$template/.env                     missing — cp $template/.env.example $template/.env"; fi
  done
  if [ -d backend/.venv ]; then echo "backend/.venv                      present"
  else echo "backend/.venv                      missing — python3 -m venv .venv"; fi
  if [ -d frontend/node_modules ]; then echo "frontend/node_modules              present"
  else echo "frontend/node_modules              missing — yarn install"; fi

  echo
  echo "== ports =="
  for port in "$MONGO_PORT" "$BACKEND_PORT" "$FRONTEND_PORT"; do
    if port_busy "$port"; then echo "$port  in use"; else echo "$port  free"; fi
  done

  echo
  if [ "$missing" = 0 ]; then
    echo "== nothing blocking — './dev.sh' should start the stack =="
  else
    echo "== install what is missing above; see DEVELOPMENT.md → 'What you need' =="
  fi
  return "$missing"
}

# Install frontend dependencies. If the install fails for the one reason that is not
# your fault — the two @emergentbase/* dev-server packages are URL dependencies on a
# vendor CDN, and yarn v1 refuses to fail softly on them (declaring them optional, or
# --ignore-optional, still exits non-zero) — retry once without them. They are editor
# tooling: the studio builds and runs without them, with two warnings.
install_frontend() {
  if [ -d node_modules ]; then return 0; fi
  if ! resolve_yarn; then
    echo "!! neither yarn nor corepack is available — install Node 20 or newer" >&2
    return 1
  fi
  if $YARN install --frozen-lockfile; then return 0; fi

  echo
  echo "!! yarn install failed — retrying without the cloud-only editor tooling"
  echo "   (@emergentbase/overlay, @emergentbase/visual-edits: see DEVELOPMENT.md)"

  local keep status=0
  keep=$(mktemp -d)
  cp package.json yarn.lock "$keep/"
  if node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync('package.json','utf8'));for (const n of ['@emergentbase/overlay','@emergentbase/visual-edits']) delete p.devDependencies[n];fs.writeFileSync('package.json', JSON.stringify(p, null, 2) + '\n');"; then
    $YARN install || status=1
  else
    status=1
  fi
  # Put the manifest back exactly as it was, whether or not the retry worked.
  cp "$keep/package.json" "$keep/yarn.lock" .
  rm -rf "$keep"

  if [ "$status" = 0 ]; then
    echo "==> installed without the editor tooling; package.json and yarn.lock are untouched"
  else
    echo "!! the install failed for another reason — see the error above" >&2
  fi
  return "$status"
}

start() {
  if have docker && docker info >/dev/null 2>&1; then
    echo "==> MongoDB (docker compose)"
    docker compose up -d mongo
  else
    echo "!! Docker is unavailable — start MongoDB yourself on 127.0.0.1:$MONGO_PORT"
    echo "   (DEVELOPMENT.md § 1; the app will report a Mongo connection error until it is up)"
  fi

  echo "==> backend  http://localhost:$BACKEND_PORT"
  (
    cd backend
    [ -f .env ] || cp .env.example .env
    [ -d .venv ] || python3 -m venv .venv
    ./.venv/bin/pip install -q -r requirements-dev.txt
    exec ./.venv/bin/python -m uvicorn server:app --reload --port "$BACKEND_PORT"
  ) &
  BACKEND_PID=$!

  echo "==> frontend http://localhost:$FRONTEND_PORT"
  (
    cd frontend
    [ -f .env ] || cp .env.example .env
    install_frontend
    BROWSER=none exec $YARN start
  ) &
  FRONTEND_PID=$!

  trap 'echo; echo "==> stopping backend and frontend (Mongo keeps running)"; kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true' INT TERM
  wait
}

case "${1:-start}" in
  start) start ;;
  check) check ;;
  install)
    ( cd backend && [ -f .env ] || cp .env.example .env; [ -d .venv ] || python3 -m venv .venv; ./.venv/bin/pip install -q -r requirements-dev.txt )
    ( cd frontend && [ -f .env ] || cp .env.example .env; install_frontend )
    echo "==> dependencies installed; './dev.sh' to start"
    ;;
  *) usage; exit 1 ;;
esac
