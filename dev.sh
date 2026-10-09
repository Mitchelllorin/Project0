#!/usr/bin/env bash
# Start the full Project Zero stack for local development.
# Mongo (via Docker) + FastAPI backend (8001) + React dev server (3000).
set -euo pipefail
cd "$(dirname "$0")"

# 1. Mongo
if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  echo "==> starting MongoDB (docker compose)"
  docker compose up -d mongo
else
  echo "!! Docker not available — start MongoDB yourself on 127.0.0.1:27017"
fi

# 2. Backend
cd backend
[ -f .env ] || cp .env.example .env
[ -d .venv ] || python3 -m venv .venv
./.venv/bin/pip install -q -r requirements-dev.txt
echo "==> starting backend on http://localhost:8001"
./.venv/bin/python -m uvicorn server:app --reload --port 8001 &
BACKEND_PID=$!
cd ..

# 3. Frontend
cd frontend
[ -f .env ] || cp .env.example .env
command -v yarn >/dev/null 2>&1 || corepack enable >/dev/null 2>&1 || true
[ -d node_modules ] || (command -v yarn >/dev/null 2>&1 && yarn install || npm install)
echo "==> starting frontend on http://localhost:3000"
BROWSER=none yarn start &
FRONTEND_PID=$!

trap 'kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true' INT TERM
wait
