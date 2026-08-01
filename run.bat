@echo off
REM ───────────────────────────────────────────────────────────────────
REM  Hedwig - end-to-end runner for Windows
REM  Installs deps, builds, runs unit tests, then runs the on-chain
REM  smoke test that produces HashScan links for your bounty submission.
REM ───────────────────────────────────────────────────────────────────

setlocal
cd /d "%~dp0"

echo.
echo [Hedwig] ==========================================================
echo [Hedwig]  End-to-end runner
echo [Hedwig] ==========================================================
echo.

REM ── .env sanity check ─────────────────────────────────────────────
if not exist ".env" (
  echo [Hedwig] .env not found. Creating one from .env.example.
  copy /Y ".env.example" ".env" >nul
  echo.
  echo [Hedwig] EDIT .env NOW:
  echo [Hedwig]   HEDERA_ACCOUNT_ID   your account id, e.g. 0.0.12345
  echo [Hedwig]   HEDERA_PRIVATE_KEY  ECDSA or ED25519 private key
  echo.
  echo [Hedwig] Grab both from https://portal.hedera.com/dashboard
  echo [Hedwig] Then re-run this script.
  exit /b 1
)

REM ── Node presence ─────────────────────────────────────────────────
where node >nul 2>&1
if errorlevel 1 (
  echo [Hedwig] Node.js is not installed or not on PATH.
  echo [Hedwig] Install from https://nodejs.org/ ^(v18 or newer^) and re-run.
  exit /b 1
)

REM ── Install ───────────────────────────────────────────────────────
if not exist "node_modules" (
  echo [Hedwig] Installing dependencies...
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo [Hedwig] npm install failed.
    exit /b 1
  )
) else (
  echo [Hedwig] Dependencies already installed. Skipping npm install.
)
echo.

REM ── Build ─────────────────────────────────────────────────────────
echo [Hedwig] Building TypeScript...
call npm run build
if errorlevel 1 (
  echo [Hedwig] Build failed.
  exit /b 1
)
echo.

REM ── Tests ─────────────────────────────────────────────────────────
echo [Hedwig] Running unit tests...
call npm test
if errorlevel 1 (
  echo [Hedwig] Unit tests failed.
  exit /b 1
)
echo.

REM ── Smoke test ────────────────────────────────────────────────────
echo [Hedwig] Running on-chain smoke test on Hedera testnet...
echo [Hedwig] This will submit REAL testnet transactions. HashScan links
echo [Hedwig] will be printed at the end for your bounty submission.
echo.
call npm run smoke
if errorlevel 1 (
  echo [Hedwig] Smoke test failed. See error above.
  exit /b 1
)

echo.
echo [Hedwig] ==========================================================
echo [Hedwig]  Done. Copy the HashScan links above into your submission.
echo [Hedwig] ==========================================================
endlocal
