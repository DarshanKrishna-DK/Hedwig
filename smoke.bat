@echo off
REM ─── Fast iteration: skip install/build/tests, only run smoke script ───
setlocal
cd /d "%~dp0"
if not exist ".env" (
  echo [Hedwig] .env not found. Run run.bat first.
  exit /b 1
)
echo [Hedwig] Running on-chain smoke test...
call npm run smoke
endlocal
