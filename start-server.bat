@echo off
rem Starts the Car Maintenance server so any device on your network can open the app.
cd /d "%~dp0"
title Car Maintenance server

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Install the LTS version from https://nodejs.org and run this file again.
  pause
  exit /b 1
)

rem Checked on every start, so packages added by an update get installed (quick when nothing changed).
echo Checking packages...
call npm install --no-audit --no-fund
if errorlevel 1 goto fail

echo Building the app...
call npm run build
if errorlevel 1 goto fail

node dist-server\server.mjs
pause
exit /b 0

:fail
echo.
echo Something went wrong, see the messages above.
pause
exit /b 1
