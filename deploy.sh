#!/usr/bin/env bash
# One client's instance: build, run and inspect the production stack.
#
#   ./deploy.sh up       build and start (or update) this instance
#   ./deploy.sh down     stop it — the database lives in a volume and is kept
#   ./deploy.sh rebrand  re-apply .env branding without rebuilding the bundle
#   ./deploy.sh logs     follow the API and web logs
#   ./deploy.sh ps       what is running
#   ./deploy.sh doctor   check this machine, this config, and the running instance
#
# See DEPLOY.md for what to change and why.
set -euo pipefail
cd "$(dirname "$0")"

COMPOSE_FILE=docker-compose.prod.yml
ENV_FILE=.env

usage() { sed -n '2,10p' "$0" | sed 's/^# \{0,1\}//'; }

# An `if` rather than `&&`: with `set -e`, a missing .env must not turn a read into an exit.
env_value() { if [ -f "$ENV_FILE" ]; then sed -n "s/^$1=[[:space:]]*//p" "$ENV_FILE" | tail -1; fi; }

compose() {
  if [ -f "$ENV_FILE" ]; then
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "$@"
  else
    docker compose -f "$COMPOSE_FILE" "$@"
  fi
}

need_env() {
  [ -f "$ENV_FILE" ] || {
    echo "!! $ENV_FILE not found. Start from the template:" >&2
    echo "     cp .env.prod.example .env    # then edit the branding and port" >&2
    exit 1
  }
}

need_docker() {
  command -v docker >/dev/null 2>&1 || { echo "!! docker is not installed. See DEPLOY.md." >&2; exit 1; }
  docker info >/dev/null 2>&1 || { echo "!! the docker daemon is not running (try: sudo systemctl start docker)." >&2; exit 1; }
}

case "${1:-up}" in
  up)
    need_env; need_docker
    compose up -d --build
    echo
    echo "==> this instance is at http://localhost:$(env_value PORT || echo 8080)"
    echo "    run './deploy.sh doctor' to check it, './deploy.sh logs' to watch it"
    ;;
  down)
    need_docker
    compose down
    echo "==> stopped. The database volume was kept; './deploy.sh up' resumes this instance."
    ;;
  rebrand)
    # The API re-reads its environment on start, so branding and the shipped catalogue
    # change without touching the bundle. The baked-in copy (which is what makes the
    # first paint branded rather than flashing) still needs 'up --build'.
    need_env; need_docker
    compose up -d --no-deps api
    echo "==> branding re-applied. Run './deploy.sh up' to bake it in for a flash-free first paint."
    ;;
  logs)  need_docker; compose logs -f --tail=100 ;;
  ps)    need_docker; compose ps ;;
  doctor)
    echo "== machine =="
    docker --version 2>/dev/null || echo "docker: NOT INSTALLED"
    docker compose version 2>/dev/null || echo "docker compose: NOT AVAILABLE"
    docker info >/dev/null 2>&1 && echo "docker daemon: running" || echo "docker daemon: NOT RUNNING"

    echo
    echo "== configuration =="
    if [ -f "$ENV_FILE" ]; then
      echo "$ENV_FILE: present"
      echo "  PUBLIC_ORIGIN    $(env_value PUBLIC_ORIGIN || true)"
      echo "  PORT             $(env_value PORT || true)"
      echo "  BRAND_NAME       $(env_value BRAND_NAME || true)"
      echo "  BRAND_SUBTITLE   $(env_value BRAND_SUBTITLE || true)"
      echo "  BRAND_ACCENT     $(env_value BRAND_ACCENT || true)"
      echo "  DEFAULT_CATALOG  $(env_value DEFAULT_CATALOG || true)"
    else
      echo "$ENV_FILE: MISSING — cp .env.prod.example .env"
    fi

    echo
    echo "== instance =="
    port=$(env_value PORT); port=${port:-8080}
    echo "  expected at http://127.0.0.1:$port"
    if curl -fsS --max-time 5 "http://127.0.0.1:$port/api/deployment" 2>/dev/null; then
      echo
      echo "  => serving on http://localhost:$port"
    else
      echo "  not answering on http://127.0.0.1:$port — is it running? ('./deploy.sh ps')"
    fi
    ;;
  *) usage; exit 1 ;;
esac
