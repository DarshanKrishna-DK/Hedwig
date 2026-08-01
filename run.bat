@echo off
REM ───────────────────────────────────────────────────────────────────
REM  Hedwig - end-to-end runner for Windows
REM  Installs deps, builds, tests, runs on-chain smoke test,
REM  then starts the MCP server ready for Claude Desktop.
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
  echo [Hedwig] [1/5] Installing dependencies...
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo [Hedwig] npm install failed.
    exit /b 1
  )
) else (
  echo [Hedwig] [1/5] Dependencies already installed. Skipping npm install.
)
echo.

REM ── Build ─────────────────────────────────────────────────────────
echo [Hedwig] [2/5] Building TypeScript...
call npm run build
if errorlevel 1 (
  echo [Hedwig] Build failed.
  exit /b 1
)
echo.

REM ── Tests ─────────────────────────────────────────────────────────
echo [Hedwig] [3/5] Running unit tests...
call npm test
if errorlevel 1 (
  echo [Hedwig] Unit tests failed.
  exit /b 1
)
echo.

REM ── Smoke test ────────────────────────────────────────────────────
echo [Hedwig] [4/5] Running on-chain smoke test on Hedera testnet...
echo [Hedwig] This submits REAL testnet transactions. HashScan links
echo [Hedwig] will be printed at the end.
echo.
call npm run smoke
if errorlevel 1 (
  echo [Hedwig] Smoke test failed. See error above.
  exit /b 1
)

REM ── Start frontend in a separate window ───────────────────────────
if exist "projects\Hedwig-frontend\package.json" (
  echo [Hedwig] Launching landing page + docs site in a new window...
  echo [Hedwig] Site will be at http://localhost:5173 once Vite finishes booting.
  start "Hedwig Frontend" cmd /k "cd /d %~dp0 && call run-frontend.bat"
  echo.
)

REM ── Start MCP server ──────────────────────────────────────────────
echo.
echo [Hedwig] ==========================================================
echo [Hedwig]  [5/5] Starting Hedwig MCP server
echo [Hedwig] ==========================================================
echo.
echo [Hedwig] The server is starting on stdio. It will look "silent" -
echo [Hedwig] that is correct. MCP servers communicate over stdin/stdout
echo [Hedwig] using JSON-RPC frames, not human-readable output.
echo.
echo [Hedwig] What to do next:
echo [Hedwig]   1. LEAVE THIS WINDOW OPEN.
echo [Hedwig]   2. Open Claude Desktop (download from claude.ai/download
echo [Hedwig]      if you don't have it). NOT claude.ai in a browser -
echo [Hedwig]      claude.ai cannot connect to local MCP servers.
echo [Hedwig]   3. Fully quit Claude Desktop from the system tray, then
echo [Hedwig]      reopen it. This forces it to re-read the config.
echo [Hedwig]   4. Open a NEW chat. Click the plug icon (bottom-left).
echo [Hedwig]      You should see "hedwig" with 7 tools.
echo [Hedwig]   5. Try prompts like:
echo [Hedwig]        - "Check my Hedera balance."
echo [Hedwig]        - "Send 0.05 HBAR to 0.0.98."
echo [Hedwig]        - "Send 0.001 USDC to 0.0.9865777."
echo [Hedwig]        - "Fetch http://localhost:4021/premium/quote and pay
echo [Hedwig]           if it costs HBAR." ^(or USDC^)
echo [Hedwig]        - "Show me my spending report."
echo.
echo [Hedwig] The landing page site is running in the other window that
echo [Hedwig] just opened. Browse it at http://localhost:5173.
echo.
echo [Hedwig] Press Ctrl+C to stop the MCP server when you are done.
echo.
echo [Hedwig] ----------------------------------------------------------
echo.
node dist/index.js

endlocal
