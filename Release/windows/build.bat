@echo off
cls
echo ============================================
echo        ActOne MSIX Build Script
echo ============================================
echo.
echo Choose signing option:
echo.
echo   [1] Self-sign (local testing)
echo   [2] Skip signing (unsigned - Store will sign)
echo   [3] Sign with PFX certificate
echo.
set /p choice="Enter choice (1-3): "

if "%choice%"=="1" goto selfsign
if "%choice%"=="2" goto skipsign
if "%choice%"=="3" goto pfxsign
echo Invalid choice. Exiting.
pause
exit /b

:selfsign
echo.
echo Self-signing selected. Requesting admin rights (needed for cert install)...
net session >nul 2>&1
if %errorLevel% neq 0 (
    powershell Start-Process -Verb RunAs -FilePath "powershell" -ArgumentList "-ExecutionPolicy Bypass -File ""%~dp0build-msix.ps1"" -SelfSign"
    exit /b
)
powershell -ExecutionPolicy Bypass -File "%~dp0build-msix.ps1" -SelfSign
pause
exit /b

:skipsign
echo.
powershell -ExecutionPolicy Bypass -File "%~dp0build-msix.ps1" -SkipSigning
pause
exit /b

:pfxsign
set /p pfxpath="Enter PFX file path: "
set /p pfxpass="Enter PFX password: "
echo.
powershell -ExecutionPolicy Bypass -File "%~dp0build-msix.ps1" -PfxPath "%pfxpath%" -PfxPassword "%pfxpass%"
pause
exit /b
