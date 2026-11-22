@echo off
rem One click: build dist\tabletop-racers.html from src\ (+ art\) and open it in your default browser.
rem Uses Node.js if installed (also checks the code), otherwise PowerShell (built into Windows).
cd /d "%~dp0"
echo Building My Game...
echo.

where node >nul 2>nul
if %errorlevel%==0 (
  node tools\build.js
) else (
  echo Node.js not found, using PowerShell instead.
  powershell -NoProfile -ExecutionPolicy Bypass -File "tools\build.ps1"
)

if errorlevel 1 (
  echo.
  echo *** Build failed. Read the message above. ***
  pause
  exit /b 1
)

if not exist "dist\tabletop-racers.html" (
  echo.
  echo *** dist\tabletop-racers.html was not created. ***
  pause
  exit /b 1
)

echo.
echo Opening dist\tabletop-racers.html ...
start "" "dist\tabletop-racers.html"
timeout /t 3 >nul
