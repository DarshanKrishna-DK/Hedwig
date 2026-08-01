#!/usr/bin/env bash
# Build a Claude Desktop .mcpb bundle from the compiled dist/.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "[hedwig] Building TypeScript..."
npm run build

BUNDLE_DIR="$ROOT/.mcpb-build"
BUNDLE_ZIP="$ROOT/hedwig-wallet.mcpb"

echo "[hedwig] Staging bundle in $BUNDLE_DIR"
rm -rf "$BUNDLE_DIR" "$BUNDLE_ZIP"
mkdir -p "$BUNDLE_DIR"

cp manifest.json "$BUNDLE_DIR/"
cp -R dist "$BUNDLE_DIR/dist"
cp package.json "$BUNDLE_DIR/"
cp README.md "$BUNDLE_DIR/" 2>/dev/null || true
cp LICENSE "$BUNDLE_DIR/" 2>/dev/null || true

echo "[hedwig] Installing production deps into the bundle..."
( cd "$BUNDLE_DIR" && npm install --omit=dev --no-audit --no-fund --silent )

echo "[hedwig] Zipping bundle..."
( cd "$BUNDLE_DIR" && zip -qr "$BUNDLE_ZIP" . )

echo "[hedwig] Cleaning up staging"
rm -rf "$BUNDLE_DIR"

echo "[hedwig] Done. Bundle at: $BUNDLE_ZIP"
