#!/usr/bin/env bash
# ───────────────────────────────────────────────────────────────────
#  Hedwig - end-to-end runner for macOS / Linux
#  Installs deps, builds, runs unit tests, then runs the on-chain
#  smoke test that produces HashScan links for your bounty submission.
# ───────────────────────────────────────────────────────────────────
set -e
cd "$(dirname "$0")"

echo
echo "[Hedwig] =========================================================="
echo "[Hedwig]  End-to-end runner"
echo "[Hedwig] =========================================================="
echo

if [ ! -f .env ]; then
  echo "[Hedwig] .env not found. Creating one from .env.example."
  cp .env.example .env
  echo
  echo "[Hedwig] EDIT .env NOW:"
  echo "[Hedwig]   HEDERA_ACCOUNT_ID   your account id, e.g. 0.0.12345"
  echo "[Hedwig]   HEDERA_PRIVATE_KEY  ECDSA or ED25519 private key"
  echo
  echo "[Hedwig] Grab both from https://portal.hedera.com/dashboard"
  echo "[Hedwig] Then re-run this script."
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "[Hedwig] Node.js is not installed. Install v18+ from https://nodejs.org/ and re-run."
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "[Hedwig] Installing dependencies..."
  npm install --no-audit --no-fund
else
  echo "[Hedwig] Dependencies already installed. Skipping npm install."
fi
echo

echo "[Hedwig] Building TypeScript..."
npm run build
echo

echo "[Hedwig] Running unit tests..."
npm test
echo

echo "[Hedwig] Running on-chain smoke test on Hedera testnet..."
echo "[Hedwig] This will submit REAL testnet transactions. HashScan links"
echo "[Hedwig] will be printed at the end for your bounty submission."
echo
npm run smoke

echo
echo "[Hedwig] =========================================================="
echo "[Hedwig]  Done. Copy the HashScan links above into your submission."
echo "[Hedwig] =========================================================="
echo

# Launch frontend in background so user gets both from one command
if [ -f projects/Hedwig-frontend/package.json ]; then
  echo "[Hedwig] Launching landing page site in background..."
  echo "[Hedwig] Site will be at http://localhost:5173 once Vite finishes booting."

  if [[ "$OSTYPE" == "darwin"* ]] && command -v osascript >/dev/null 2>&1; then
    # macOS: open in a new Terminal window
    osascript -e "tell application \"Terminal\" to do script \"cd '$(pwd)' && ./run-frontend.sh\"" >/dev/null 2>&1 || true
  elif command -v gnome-terminal >/dev/null 2>&1; then
    gnome-terminal -- bash -c "cd '$(pwd)' && ./run-frontend.sh; exec bash" >/dev/null 2>&1 || true
  else
    # Fallback: run in background of current terminal
    nohup ./run-frontend.sh >/tmp/hedwig-frontend.log 2>&1 &
    echo "[Hedwig] Frontend logs: /tmp/hedwig-frontend.log"
  fi
fi
