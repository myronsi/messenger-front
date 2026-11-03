#!/usr/bin/env bash
# Run on the staging host after uploading releases/sha-<commit>/dist.tar.gz.
set -euo pipefail
root="$1" commit="$2" origin="$3"
[[ "$root" == /var/www/messenger-staging ]]
[[ "$commit" =~ ^[a-f0-9]{40}$ ]]
[[ "$origin" == https://staging.messenger.viserix.com ]]
cd "$root"
release="releases/sha-$commit"
tar -xzf "$release/dist.tar.gz" -C "$release"
[[ -s "$release/index.html" ]]
grep -Fq "\"commit\":\"${commit:0:7}\"" "$release/version.json"
rm "$release/dist.tar.gz"
previous="$(readlink current || true)"
ln -sfn "$release" current.tmp
mv -T current.tmp current
ready=false
for attempt in $(seq 1 10); do
  if curl -fsS --max-time 10 -H 'Cache-Control: no-cache' "$origin/version.json?deploy=$commit" \
    | grep -Fq "\"commit\":\"${commit:0:7}\""; then
    ready=true
    break
  fi
  sleep 2
done
if [[ "$ready" != true ]]; then
  if [[ -n "$previous" ]]; then
    ln -sfn "$previous" current.tmp
    mv -T current.tmp current
  else
    rm current
  fi
  echo 'Staging verification failed; restored the previous frontend.' >&2
  exit 1
fi
# Keep the current release and the four most recently modified rollback releases.
find releases -mindepth 1 -maxdepth 1 -type d ! -path "$release" -printf '%T@ %p\n' \
  | sort -nr | tail -n +5 | cut -d' ' -f2- | while IFS= read -r old; do
    case "$old" in releases/*) rm -rf -- "$old" ;; *) exit 1 ;; esac
  done
printf 'Staging frontend deployed: %s\n' "$commit"
