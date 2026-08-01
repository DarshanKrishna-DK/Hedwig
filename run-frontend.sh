#!/usr/bin/env bash
# ───────────────────────────────────────────────────────────────────
#  Hedwig - frontend runner for macOS / Linux
#  Boots the landing page + docs site on http://localhost:5173.
#  Separate from run.sh because Vite dev server and MCP server on
#  stdio cannot share a terminal.
# ───────────────────────────────────────────────────────────────────

set -e
cd "$(dirname "$0")"

echo
echo "[Hedwig] =========================================================="
echo "[Hedwig]  Frontend runner (landing page + docs site)"
echo "[Hedwig] =========================================================="
echo

if [ ! -f "projects/Hedwig-frontend/package.json" ]; then
  echo "[Hedwig] projects/Hedwig-frontend/package.json not found."
  echo "[Hedwig] Run patch11 first to install the frontend, or clone"
  echo "[Hedwig] the full repo from GitHub."
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "[Hedwig] Node.js is not installed or not on PATH."
  echo "[Hedwig] Install from https://nodejs.org/ (v20 or newer) and re-run."
  exit 1
fi

cd projects/Hedwig-frontend

if [ ! -d "node_modules" ]; then
  echo "[Hedwig] [1/2] Installing frontend dependencies..."
  npm install --no-audit --no-fund
else
  echo "[Hedwig] [1/2] Dependencies already installed. Skipping npm install."
fi
echo

echo "[Hedwig] [2/2] Starting Vite dev server..."
echo
echo "[Hedwig] The site will open at http://localhost:5173"
echo "[Hedwig] Press Ctrl+C in this window to stop."
echo
exec npm run dev
