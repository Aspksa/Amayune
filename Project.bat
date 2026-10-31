@echo off
setlocal EnableExtensions DisableDelayedExpansion
title Amayune
pushd "%~dp0"
if errorlevel 1 goto folder_error
if not exist "scripts\launch.mjs" goto missing
if not exist "scripts\bootstrap-node.ps1" goto missing

rem The PowerShell bootstrap writes a verified executable path to a UTF-8 file.
powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "scripts\bootstrap-node.ps1" -Root "%CD%"
if errorlevel 1 goto bootstrap_error
if not exist ".runtime\node-path.txt" goto bootstrap_error
set /p NODE_EXE=<".runtime\node-path.txt"
if not exist "%NODE_EXE%" goto bootstrap_error

chcp 65001 >nul
"%NODE_EXE%" "scripts\launch.mjs" %*
set "RC=%ERRORLEVEL%"
if not "%RC%"=="0" goto launch_error
goto done

:missing
echo [ERROR] Required launcher scripts are missing.
set "RC=2"
goto failed
:folder_error
echo [ERROR] Cannot access the project folder.
set "RC=3"
goto failed
:bootstrap_error
echo [ERROR] Node.js is unavailable. See bootstrap diagnostics.
set "RC=4"
goto failed
:launch_error
echo.
echo [ERROR] Amayune failed. Exit code: %RC%.
goto failed
:failed
echo.
echo Check logs and the README for recovery instructions.
pause
:done
popd
endlocal & exit /b %RC%
