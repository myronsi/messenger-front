#!/usr/bin/env bash
# Starts the Go backend and its stores from published Docker images, so frontend work needs no Go setup.
# It uses the backend's own production stack (messenger-back deploy/go) with single-node stores.
#
#   scripts/backend-up.sh [tag]     tag: v1.0.0-alpha.1, go-master, go-sha-abc1234 (default: scripts/backend-version)
#   scripts/backend-up.sh down      stop and remove the stack and its data
#
# The API listens on http://127.0.0.1:${BACKEND_PORT:-8080}/api/v2. The stack's files come from the backend
# repository at BACKEND_REF (default: the release tag, or master for go-* snapshot tags).
set -euo pipefail

REPO="${BACKEND_REPO:-myronsi/messenger-back}"
IMAGE_REPO="ghcr.io/${REPO}"
PORT="${BACKEND_PORT:-8080}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIR="${BACKEND_STACK_DIR:-$ROOT/.backend-stack}"
APP="$DIR/go"

if [[ "${1:-}" == "down" ]]; then
  [[ -f "$APP/compose.yaml" ]] && (cd "$APP" && docker compose down -v --remove-orphans)
  exit 0
fi

TAG="${1:-$(tr -d '[:space:]' < "$ROOT/scripts/backend-version")}"
case "$TAG" in [0-9]*) TAG="v$TAG" ;; esac
case "$TAG" in
  go-*) REF="${BACKEND_REF:-master}" ;;
  v0.*) echo "$TAG is a Python release; the v2 frontend needs the Go backend (1.x or go-*)" >&2; exit 1 ;;
  *) REF="${BACKEND_REF:-$TAG}" ;;
esac

# The stack, its scripts and the migrations of that backend version.
rm -rf "$DIR/src"
mkdir -p "$DIR/src" "$APP"
curl --fail --silent --show-error --location --retry 3 "https://codeload.github.com/${REPO}/tar.gz/${REF}" \
  | tar -xz -C "$DIR/src" --strip-components=1
(cd "$DIR/src" && bash deploy/go/bundle.sh "$APP")

# A fresh .env for local use (kept between runs: the stores keep the passwords they were created with).
if [[ ! -f "$APP/.env" ]]; then
  hex() { openssl rand -hex "$1"; }
  declare -A secret=(
    [JWT_SECRET]="$(hex 32)" [RECOVERY_PEPPER]="$(hex 32)" [ENCRYPTION_KEY]="$(openssl rand -base64 32)"
    [POSTGRES_PASSWORD]="$(hex 16)" [REDIS_PASSWORD]="$(hex 16)" [ELASTIC_PASSWORD]="$(hex 16)"
    [S3_ACCESS_KEY]="$(hex 8)" [S3_SECRET_KEY]="$(hex 20)"
  )
  env_file="$(cat "$APP/env.example")"
  for key in "${!secret[@]}"; do
    env_file="$(printf '%s\n' "$env_file" | sed "s|^${key}=\$|${key}=${secret[$key]}|; s|\\\${${key}}|${secret[$key]}|g")"
  done
  # Local HTTP: no secure cookies, and the Vite dev server as the allowed origin.
  printf '%s\n' "$env_file" | sed \
    -e 's|^APP_ENV=.*|APP_ENV=development|' \
    -e 's|^COOKIE_SECURE=.*|COOKIE_SECURE=false|' \
    -e 's|^CORS_ORIGINS=.*|CORS_ORIGINS=http://127.0.0.1:5173,http://localhost:5173|' \
    -e "s|^API_PORT=.*|API_PORT=${PORT}|" \
    -e "s|^WORKER_PORT=.*|WORKER_PORT=$((PORT + 1))|" > "$APP/.env"
  chmod 600 "$APP/.env"
fi

# deploy.sh pulls the image, starts the stores, migrates and waits until the API is ready. It would prune
# unused images on a server; on a developer machine it must not.
PRUNE_IMAGES=false bash "$APP/deploy.sh" "$APP" "${IMAGE_REPO}:${TAG}"
curl --silent "http://127.0.0.1:${PORT}/api/v2/meta"
echo
