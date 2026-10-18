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

if not exist node_modules (
  echo Installing, this only happens the first time...
  call npm install
  if errorlevel 1 goto fail
)

echo Building the app...
call npm run build
if errorlevel 1 goto fail

node server\server.mjs
pause
exit /b 0

:fail
echo.
echo Something went wrong, see the messages above.
pause
exit /b 1
