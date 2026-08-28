#!/bin/bash
# MateCat analysis daemons (FastAnalysis + TmAnalysis).
set -Eeuo pipefail
cd /var/www/html
export MATECAT_HOME=/var/www/html

echo "[worker] waiting for vendor + config from the app container…"
until [ -f vendor/autoload.php ] && [ -f inc/config.ini ] && [ -f inc/task_manager_config.ini ]; do
  sleep 3
done

echo "[worker] waiting for MySQL…"
until (exec 3<>/dev/tcp/db/3306) 2>/dev/null; do sleep 2; done

TASK_CONFIG=/var/www/html/inc/task_manager_config.ini
echo "[worker] starting FastAnalysis + TmAnalysis…"
php daemons/FastAnalysis.php "$TASK_CONFIG" &
FAST=$!
php daemons/TmAnalysis.php "$TASK_CONFIG" &
TM=$!

# If either daemon exits, stop the container so Compose restarts both cleanly.
wait -n "$FAST" "$TM"
echo "[worker] a daemon exited — stopping container for restart."
kill "$FAST" "$TM" 2>/dev/null || true
exit 1
