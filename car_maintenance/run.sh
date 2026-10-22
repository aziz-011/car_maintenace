#!/bin/sh
# Starts the Car Maintenance server inside Home Assistant. Data is kept in
# /config (the add-on's folder in /addon_configs); options come from the
# add-on's Configuration tab.
set -e

if [ -f /data/options.json ]; then
  APP_URL=$(node -e "try { process.stdout.write(require('/data/options.json').app_url || '') } catch {}")
  export APP_URL
fi

exec node /app/dist-server/server.mjs
