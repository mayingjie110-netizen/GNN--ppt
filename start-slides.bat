@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Please install Node.js or start the deck with another static server.
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$port=4173; " ^
  "$alive=$false; " ^
  "try { $r=Invoke-WebRequest -Uri ('http://127.0.0.1:'+$port+'/') -UseBasicParsing -TimeoutSec 2; $alive=$r.StatusCode -eq 200 } catch { $alive=$false }; " ^
  "if (-not $alive) { Start-Process -WindowStyle Hidden -FilePath node -ArgumentList @('server.mjs') -WorkingDirectory (Get-Location).Path; Start-Sleep -Seconds 2 }; " ^
  "Start-Process ('http://127.0.0.1:'+$port+'/')"

echo Slides opened at http://127.0.0.1:4173/
echo If the browser did not open, copy the URL above into Edge or Chrome.
pause
