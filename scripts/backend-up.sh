#!/usr/bin/env bash
# Starts the backend and its stores from published Docker images, so frontend work needs no
# Python or Go setup.
#
#   scripts/backend-up.sh [tag]     tag: 0.5.1, v0.5.1, master, sha-abc1234 (default: scripts/backend-version)
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

if [ "${1:-}" = "down" ]; then
  [ -f "$FILE" ] && docker compose -f "$FILE" down -v --remove-orphans
  exit 0
fi

TAG="${1:-$(tr -d '[:space:]' < "$ROOT/scripts/backend-version")}"
# Release tags are vX.Y.Z; a bare X.Y.Z is accepted too.
RELEASE_TAG="$TAG"
case "$TAG" in [0-9]*) RELEASE_TAG="v$TAG" ;; esac

mkdir -p "$DIR"
RAW="https://raw.githubusercontent.com/${REPO}"

download() { curl --fail --silent --show-error --location --retry 3 --output "$FILE" "$1"; }

# A release carries a compose file with the image pinned to that release. Older releases and
# branch tags do not, so fall back to the file in the repository and override the image.
if download "https://github.com/${REPO}/releases/download/${RELEASE_TAG}/compose.stack.yaml" 2>/dev/null; then
  echo "Using compose.stack.yaml from release ${RELEASE_TAG}"
else
  REF=master
  echo "Release asset not found, using deploy/compose.stack.yaml from ${REF} with image tag ${TAG}"
  download "${RAW}/${REF}/deploy/compose.stack.yaml"
  export BACKEND_IMAGE="${BACKEND_IMAGE:-${IMAGE_REPO}:${TAG}}"
fi

docker compose -f "$FILE" pull
docker compose -f "$FILE" up -d

echo "Waiting for http://127.0.0.1:${PORT}/version"
for _ in $(seq 1 60); do
  if curl --fail --silent "http://127.0.0.1:${PORT}/version" > /dev/null; then
    curl --silent "http://127.0.0.1:${PORT}/version"
    echo
    exit 0
  fi
  sleep 2
done

echo "Backend did not become ready in time" >&2
docker compose -f "$FILE" logs --tail 80 >&2
exit 1