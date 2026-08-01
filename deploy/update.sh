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

running=$(docker inspect --format '{{.Image}}' learn-japanese 2>/dev/null || echo 'none')
docker compose -f compose.yml pull --quiet
docker compose -f compose.yml up -d --quiet-pull
now=$(docker inspect --format '{{.Image}}' learn-japanese 2>/dev/null || echo 'none')

if [ "$running" != "$now" ]; then
  echo "$(date '+%Y-%m-%d %H:%M:%S') deployed ${now}"
  docker image prune -f >/dev/null
fi
