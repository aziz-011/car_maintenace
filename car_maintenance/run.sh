#!/bin/sh
# Starts the Car Maintenance server inside Home Assistant. Data is kept in
# /config (the add-on's folder in /addon_configs); options come from the
# add-on's Configuration tab.
set -e

if [ -f /data/options.json ]; then
  APP_URL=$(node -e "try { process.stdout.write(require('/data/options.json').app_url || '') } catch {}")
  case "$APP_URL" in
    ''|http://*|https://*) ;;
    *) echo "Ignoring the address for email links: it must start with http:// or https:// (got: $APP_URL)"; APP_URL='' ;;
  esac
  export APP_URL
  APP_PASSWORD=$(node -e "try { process.stdout.write(require('/data/options.json').password || '') } catch {}")
  export APP_PASSWORD
fi

exec node /app/dist-server/server.mjs
