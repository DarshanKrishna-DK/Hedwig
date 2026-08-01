@echo off
REM ─── Launches the local x402 demo server on port 4021 ─────────────
setlocal
cd /d "%~dp0"

if not exist ".env" (
  echo [x402-server] .env not found. Run run.bat first to set up credentials.
  exit /b 1
)

if not exist "node_modules" (
  echo [x402-server] node_modules missing. Run run.bat first.
  exit /b 1
)

echo.
echo [x402-server] Starting x402 demo server on http://localhost:4021
echo [x402-server] LEAVE THIS WINDOW OPEN while running the demo.
echo [x402-server] Press Ctrl+C to stop.
echo.

node examples/x402-server/server.mjs
endlocal
