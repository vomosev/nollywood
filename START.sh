#!/usr/bin/env bash
#
# START.sh — production bootstrap for the Nollywood video distribution platform.
#
#   Frontend : Next.js App Router  -> https://nollywood.arx-app.com
#   API      : Express + MySQL     -> https://nollywood-api.arx-app.com:50109
#
# Usage: ./START.sh
#

set -e

APP_NAME="nollywood"
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_URL="https://nollywood.arx-app.com"
API_URL="https://nollywood-api.arx-app.com:50109"

cd "$APP_DIR"

echo "=============================================="
echo " Nollywood — starting production environment"
echo " Directory: $APP_DIR"
echo "=============================================="

# ---------------------------------------------------------------------------
# 1. Load environment variables from .env (if present)
# ---------------------------------------------------------------------------
if [ -f "$APP_DIR/.env" ]; then
  echo "[1/5] Loading environment from .env ..."
  set -a
  # shellcheck disable=SC1091
  . "$APP_DIR/.env"
  set +a
else
  echo "[1/5] No .env file found — relying on the ambient environment."
  echo "      (Copy .env.example to .env and fill in the values.)"
fi

export NODE_ENV="${NODE_ENV:-production}"

# ---------------------------------------------------------------------------
# 2. Install dependencies
# ---------------------------------------------------------------------------
echo "[2/5] Installing dependencies ..."
npm install --omit=dev || npm install

# ---------------------------------------------------------------------------
# 3. Build the Next.js production bundle
# ---------------------------------------------------------------------------
echo "[3/5] Building the Next.js production bundle ..."
npm run build

# ---------------------------------------------------------------------------
# 4. Launch the Express API in the background
# ---------------------------------------------------------------------------
mkdir -p "$APP_DIR/logs"

echo "[4/5] Starting the Express API (server/index.js) ..."

# Stop any previous API process started by this script.
if [ -f "$APP_DIR/logs/api.pid" ]; then
  OLD_PID="$(cat "$APP_DIR/logs/api.pid" 2>/dev/null || true)"
  if [ -n "$OLD_PID" ] && kill -0 "$OLD_PID" 2>/dev/null; then
    echo "      Stopping previous API process (pid $OLD_PID) ..."
    kill "$OLD_PID" 2>/dev/null || true
    sleep 2
  fi
  rm -f "$APP_DIR/logs/api.pid"
fi

nohup node server/index.js > logs/api.log 2>&1 &
API_PID=$!
echo "$API_PID" > "$APP_DIR/logs/api.pid"
sleep 2

if kill -0 "$API_PID" 2>/dev/null; then
  echo "      API running with pid $API_PID (logs: logs/api.log)"
else
  echo "      WARNING: the API process exited immediately. Last log lines:"
  tail -n 30 "$APP_DIR/logs/api.log" || true
fi

# ---------------------------------------------------------------------------
# 5. Start the Next.js production server with pm2
# ---------------------------------------------------------------------------
echo "[5/5] Starting the Next.js frontend with pm2 ..."

if command -v pm2 >/dev/null 2>&1; then
  pm2 delete "$APP_NAME" >/dev/null 2>&1 || true
  pm2 start ecosystem.config.js --update-env
  pm2 save >/dev/null 2>&1 || true
  pm2 list || true
else
  echo "      pm2 not found — falling back to 'npm run start' in the background."
  nohup npm run start > logs/web.log 2>&1 &
  echo "$!" > "$APP_DIR/logs/web.pid"
  sleep 2
fi

echo ""
echo "=============================================="
echo " Nollywood is up"
echo "  Frontend : $FRONTEND_URL"
echo "  API      : $API_URL"
echo "  API log  : $APP_DIR/logs/api.log"
echo "=============================================="