#!/usr/bin/env bash
# Poll GHCR for a newer image and swap the container only when one exists.
# Run by the launchd agent (see com.chenophobia.learn-japanese.update.plist)
# every 5 minutes; safe to run by hand at any time.
#
# `docker compose up -d` is a no-op when the pulled image is identical to the
# running one, so the common case (no new image) touches nothing and the app
# is only restarted for an actual deploy.
set -euo pipefail
cd "$(dirname "$0")"

# Compose narrates "Pulling / Pulled / Running" on stderr even with
# --quiet-pull. At one run every 5 minutes that noise would be the only
# thing this log ever accumulated, so each step's output is captured and
# replayed only if it fails: a healthy poll writes nothing, and the log
# stays a record of deploys and breakage rather than a treadmill.
run() {
  local out
  if ! out=$("$@" 2>&1); then
    echo "$(date '+%Y-%m-%d %H:%M:%S') FAILED: $*"
    echo "$out"
    return 1
  fi
}

running=$(docker inspect --format '{{.Image}}' learn-japanese 2>/dev/null || echo 'none')
run docker compose -f compose.yml pull --quiet
run docker compose -f compose.yml up -d --quiet-pull
now=$(docker inspect --format '{{.Image}}' learn-japanese 2>/dev/null || echo 'none')

if [ "$running" != "$now" ]; then
  echo "$(date '+%Y-%m-%d %H:%M:%S') deployed ${now}"
  docker image prune -f >/dev/null
fi
