#!/usr/bin/env sh
# Starts the Car Maintenance server so any device on your network can open the app.
set -e
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed. Install the LTS version from https://nodejs.org and run this again."
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "Installing, this only happens the first time..."
  npm install
fi

echo "Building the app..."
npm run build
exec node dist-server/server.mjs
