@echo off
title ESP32 Vital Monitor & Cardiogram - Offline Windows .EXE Builder
echo ===============================================================================
echo   ESP32 Vital Monitor ^& Computer Cardiogram - Offline Windows .EXE Packager
echo ===============================================================================
echo.

cd /d "%~dp0\.."

echo [1/3] Building production web bundle (vite build)...
call npm run build

echo.
echo [2/3] Installing Electron ^& Electron-Builder (if not already installed)...
call npm install --save-dev electron electron-builder

echo.
echo [3/3] Packaging standalone Windows .EXE into /windows_exe/dist_exe/...
call npx electron-builder --win portable --projectDir . --config.directories.output=windows_exe/dist_exe --config.extraMetadata.main=windows_exe/electron-main.cjs --config.appId=com.vitalmonitor.cardiogram --config.productName="VitalMonitor_Cardiogram_Offline"

echo.
echo ===============================================================================
echo   DONE! Your standalone Windows .EXE is stored in:
echo   %~dp0dist_exe\VitalMonitor_Cardiogram_Offline.exe
echo ===============================================================================
pause
