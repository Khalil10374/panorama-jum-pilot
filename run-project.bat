@echo off
setlocal
title Panorama Jum Pilot Project

cd /d "%~dp0"
set "ROOT=%CD%"
set "WEB_URL=http://127.0.0.1:5173"
set "API_URL=http://127.0.0.1:8000"

for /f "usebackq delims=" %%i in (`powershell -NoProfile -Command "Get-NetIPConfiguration -ErrorAction SilentlyContinue ^| Where-Object { $_.IPv4DefaultGateway } ^| Select-Object -First 1 -ExpandProperty IPv4Address ^| Select-Object -First 1 -ExpandProperty IPAddress"`) do set "LAN_IP=%%i"
if not defined LAN_IP set "LAN_IP=YOUR-PC-IP"
set "MOBILE_URL=http://%LAN_IP%:5173"

echo.
echo Starting Panorama Jum Pilot Project...
echo Project folder: %ROOT%
echo.

where python >nul 2>nul
if errorlevel 1 (
  echo ERROR: Python was not found in PATH.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo ERROR: npm was not found in PATH.
  pause
  exit /b 1
)

if not exist "%ROOT%\apps\web\node_modules" (
  echo Installing frontend dependencies...
  call npm --prefix "%ROOT%\apps\web" install
  if errorlevel 1 (
    echo ERROR: Frontend dependency installation failed.
    pause
    exit /b 1
  )
)

python -c "import fastapi, uvicorn, sqlalchemy, pydantic_settings" >nul 2>nul
if errorlevel 1 (
  echo Installing backend dependencies...
  python -m pip install -r "%ROOT%\apps\api\requirements.txt"
  if errorlevel 1 (
    echo ERROR: Backend dependency installation failed.
    pause
    exit /b 1
  )
)

powershell -NoProfile -Command "if (Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }" >nul 2>nul
if errorlevel 1 (
  echo Starting backend on %API_URL% and the local network ...
  start "Kaptai Resort API" powershell -NoExit -NoProfile -Command "Set-Location -LiteralPath '%ROOT%'; python -m uvicorn src.main:app --reload --host 0.0.0.0 --port 8000 --app-dir apps/api"
) else (
  echo Backend already appears to be running on %API_URL%.
)

powershell -NoProfile -Command "if (Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }" >nul 2>nul
if errorlevel 1 (
  echo Starting frontend on %WEB_URL% and the local network ...
  start "Kaptai Resort Web" powershell -NoExit -NoProfile -Command "Set-Location -LiteralPath '%ROOT%'; npm --prefix apps/web run dev"
) else (
  echo Frontend already appears to be running on %WEB_URL%.
)

echo.
echo Opening browser...
timeout /t 5 /nobreak >nul
start "" "%WEB_URL%"

echo.
echo Mobile URL (use this on a phone connected to the same Wi-Fi):
echo %MOBILE_URL%
echo.
echo If the phone cannot connect, allow Node.js and Python through Windows Firewall
echo on Private networks, and make sure the Wi-Fi is not an isolated Guest network.
echo Close the API/Web terminal windows to stop the project.
pause
