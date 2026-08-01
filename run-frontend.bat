@echo off
REM ───────────────────────────────────────────────────────────────────
REM  Hedwig - frontend runner for Windows
REM  Boots the landing page + docs site on http://localhost:5173.
REM  This is separate from run.bat because Vite dev server and MCP
REM  server on stdio cannot share a terminal.
REM ───────────────────────────────────────────────────────────────────

setlocal
cd /d "%~dp0"

echo.
echo [Hedwig] ==========================================================
echo [Hedwig]  Frontend runner (landing page + docs site)
echo [Hedwig] ==========================================================
echo.

REM ── Frontend folder present? ──────────────────────────────────────
if not exist "projects\Hedwig-frontend\package.json" (
  echo [Hedwig] projects\Hedwig-frontend\package.json not found.
  echo [Hedwig] Run patch11 first to install the frontend, or clone
  echo [Hedwig] the full repo from GitHub.
  exit /b 1
)

REM ── Node presence ─────────────────────────────────────────────────
where node >nul 2>&1
if errorlevel 1 (
  echo [Hedwig] Node.js is not installed or not on PATH.
  echo [Hedwig] Install from https://nodejs.org/ ^(v20 or newer^) and re-run.
  exit /b 1
)

cd projects\Hedwig-frontend

REM ── Install ───────────────────────────────────────────────────────
if not exist "node_modules" (
  echo [Hedwig] [1/2] Installing frontend dependencies...
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo [Hedwig] npm install failed.
    exit /b 1
  )
) else (
  echo [Hedwig] [1/2] Dependencies already installed. Skipping npm install.
)
echo.

REM ── Start Vite ────────────────────────────────────────────────────
echo [Hedwig] [2/2] Starting Vite dev server...
echo.
echo [Hedwig] The site will open at http://localhost:5173
echo [Hedwig] Press Ctrl+C in this window to stop.
echo.
call npm run dev

endlocal
