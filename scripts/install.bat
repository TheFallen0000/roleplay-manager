@echo off
REM install.bat — install dependencies for roleplay-manager (Windows)
REM Usage: scripts\install.bat

setlocal enabledelayedexpansion

set NODE_MIN_MAJOR=22
set NODE_MIN_MINOR=23
set NODE_MIN_PATCH=4
set PNPM_MIN_MAJOR=11
set PNPM_MIN_MINOR=15

echo.
echo ==^> Checking Node.js
where node >nul 2>&1
if errorlevel 1 (
    echo [31mNode.js is not installed.[0m
    echo Please install Node.js ^>= 22.23.4 from https://nodejs.org/
    exit /b 1
)

for /f "tokens=*" %%v in ('node -v') do set NODE_VERSION=%%v
set NODE_VERSION=%NODE_VERSION:v=%
for /f "tokens=1 delims=." %%a in ("%NODE_VERSION%") do set NODE_MAJOR=%%a
for /f "tokens=2 delims=." %%a in ("%NODE_VERSION%") do set NODE_MINOR=%%a
for /f "tokens=3 delims=." %%a in ("%NODE_VERSION%") do set NODE_PATCH=%%a

if %NODE_MAJOR% lss %NODE_MIN_MAJOR% goto :node_too_old
if %NODE_MAJOR% gtr %NODE_MIN_MAJOR% goto :node_ok
if %NODE_MINOR% lss %NODE_MIN_MINOR% goto :node_too_old
if %NODE_MINOR% gtr %NODE_MIN_MINOR% goto :node_ok
if %NODE_PATCH% lss %NODE_MIN_PATCH% goto :node_too_old

echo [32mNode.js %NODE_VERSION% OK[0m
goto :node_ok

:node_too_old
echo [31mNode.js %NODE_VERSION% is too old. Need ^>= %NODE_MIN_MAJOR%.%NODE_MIN_MINOR%.%NODE_MIN_PATCH%[0m
echo Please update from https://nodejs.org/
exit /b 1

:node_ok
echo.
echo ==^> Checking pnpm
where pnpm >nul 2>&1
if errorlevel 1 (
    echo [33mpnpm not found. Trying to install via corepack...[0m
    where corepack >nul 2>&1
    if errorlevel 1 (
        echo [31mcorepack is not available. Please install pnpm manually: https://pnpm.io/installation[0m
        exit /b 1
    )
    call corepack enable
    call corepack prepare pnpm@latest --activate
)

for /f "tokens=*" %%v in ('pnpm -v') do set PNPM_VERSION=%%v
echo [32mpnpm %PNPM_VERSION% OK[0m

echo.
echo ==^> Installing dependencies
call pnpm install
if errorlevel 1 exit /b 1

echo.
echo [32mInstallation complete.[0m
echo.
echo To start the app, run:
echo   scripts\start.bat
echo.

endlocal
