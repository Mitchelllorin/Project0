#!/usr/bin/env bash
# Start the whole stack for local development: MongoDB + FastAPI (8001) + React (3000).
#
#   ./dev.sh          start everything; Ctrl-C stops the two servers
#   ./dev.sh check    report what this machine has and what is missing — changes nothing
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

check() {
  local missing=0

  echo "== toolchain =="
  if have node; then echo "node      $(first_line node)   (needs 20+)"
  else echo "node      MISSING — install Node 20 or newer"; missing=1; fi
  if have yarn; then echo "yarn      $(first_line yarn)"
  elif have corepack; then echo "yarn      via corepack — run 'corepack enable'"
  else echo "yarn      MISSING — 'corepack enable', or 'npm install -g yarn@1.22.22'"; missing=1; fi
  if have python3; then echo "python3   $(first_line python3)   (needs 3.11–3.12)"
  else echo "python3   MISSING — install Python 3.11 or 3.12"; missing=1; fi
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
    have yarn || corepack enable >/dev/null 2>&1 || true
    [ -d node_modules ] || yarn install --frozen-lockfile
    BROWSER=none exec yarn start
  ) &
  FRONTEND_PID=$!

  trap 'echo; echo "==> stopping backend and frontend (Mongo keeps running)"; kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true' INT TERM
  wait
}

case "${1:-start}" in
  start) start ;;
  check) check ;;
  *) usage; exit 1 ;;
esac
