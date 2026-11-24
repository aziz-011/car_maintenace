#!/usr/bin/env sh
# Starts the Car Maintenance server so any device on your network can open the app.
set -e
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed. Install the LTS version from https://nodejs.org and run this again."
  exit 1
fi

# Checked on every start, so packages added by an update get installed (quick when nothing changed).
echo "Checking packages..."
npm install --no-audit --no-fund

echo "Building the app..."
npm run build
exec node dist-server/server.mjs
