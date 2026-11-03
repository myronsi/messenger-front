#!/usr/bin/env bash
# Starts the backend and its stores from published Docker images, so frontend work needs no
# Go compiler setup.
#
#   scripts/backend-up.sh [tag]     tag: v1.5.0-alpha.1, go-master, go-sha-abc1234 (default: scripts/backend-version)
#   scripts/backend-up.sh down      stop and remove the stack
#
# The backend listens on http://127.0.0.1:${BACKEND_PORT:-8000}.
# The default tag is the backend release that implements the pinned contract; update
# scripts/backend-version together with @myronsi/messenger-api.
set -euo pipefail

REPO="${BACKEND_REPO:-myronsi/messenger-back}"
IMAGE_REPO="ghcr.io/${REPO}"
PORT="${BACKEND_PORT:-8000}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIR="${BACKEND_STACK_DIR:-$ROOT/.backend-stack}"
FILE="$DIR/compose.stack.yaml"

if [[ "${1:-}" == "down" ]]; then
  [[ -f "$FILE" ]] && docker compose -f "$FILE" down -v --remove-orphans
  exit 0
fi

TAG="${1:-$(tr -d '[:space:]' < "$ROOT/scripts/backend-version")}"
# Release tags are vX.Y.Z; a bare X.Y.Z is accepted too.
RELEASE_TAG="$TAG"
case "$TAG" in [0-9]*) RELEASE_TAG="v$TAG" ;; esac

case "$RELEASE_TAG" in
  v0.*|master|sha-*) echo "Retired Python backend tag: $TAG. Use a Go release or go-master/go-sha-*" >&2; exit 1 ;;
esac
if [[ ! "$RELEASE_TAG" =~ ^v[1-9][0-9]*\.[0-9]+\.[0-9]+([.-][A-Za-z0-9.-]+)?$ && ! "$RELEASE_TAG" =~ ^go-(master|sha-[a-f0-9]{7,40})$ ]]; then
  echo "Unsupported Go backend tag: $TAG" >&2
  exit 1
fi
bash "$ROOT/scripts/backend-go-up.sh" "$RELEASE_TAG" "$DIR" "$PORT"
