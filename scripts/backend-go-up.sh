#!/usr/bin/env bash
# Starts a released Go backend with its matching migrations and isolated development stores.
set -euo pipefail
tag="$1" dir="$2" port="$3"
repo="${BACKEND_REPO:-myronsi/messenger-back}"
image_tag="$tag"
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source="$dir/source-$tag"
ref="refs/tags/$tag"
case "$tag" in
  go-master) ref=refs/heads/master ;;
  go-sha-*) ref="${tag#go-sha-}"; image_tag="go-sha-${ref:0:7}" ;;
esac
mkdir -p "$source"
curl --proto '=https' --proto-redir '=https' --fail --silent --show-error --location --retry 3 \
  "https://codeload.github.com/$repo/tar.gz/$ref" | tar -xz --strip-components=1 -C "$source"
(cd "$source" && bash deploy/go/bundle.sh "$dir")
node "$root/scripts/backend-go-env.mjs" "$dir/env.example" "$dir/.env" "$port"
# Keep the frontend cleanup/log path pointing at the Go stack.
cp "$dir/compose.yaml" "$dir/compose.stack.yaml"
if [[ "$tag" == go-master ]]; then
  docker pull "ghcr.io/$repo:$image_tag"
fi
PRUNE_IMAGES=false bash "$dir/deploy.sh" "$dir" "ghcr.io/$repo:$image_tag"
if [[ -n "${GITHUB_ENV:-}" ]]; then
  {
    printf 'E2E_API_URL=http://127.0.0.1:%s/api/v2\n' "$port"
    printf 'GO_API_TESTS=1\n'
    printf 'E2E_CLIENT_API_VERSION=%s\n' "$(cd "$root" && node --input-type=module -e "import { API_VERSION } from '@myronsi/messenger-api'; console.log(API_VERSION)")"
  } >> "$GITHUB_ENV"
fi
curl --fail --silent --show-error "http://127.0.0.1:$port/api/v2/meta"
