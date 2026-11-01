@echo off
setlocal EnableExtensions DisableDelayedExpansion
title Amayune
pushd "%~dp0"
if errorlevel 1 goto folder_error
set "RC=0"
if not exist "scripts\launch.mjs" goto missing
if not exist "scripts\bootstrap-node.ps1" goto missing
if not exist "launcher.config.json" goto no_app
if not exist "package.json" goto no_app
powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "scripts\bootstrap-node.ps1" -Root "%CD%"
if errorlevel 1 goto bootstrap_error
if not exist ".runtime\node-path.txt" goto bootstrap_error
set /p NODE_EXE=<".runtime\node-path.txt"
if /i "%NODE_EXE%"=="node.exe" (
  where node.exe >nul 2>&1
  if errorlevel 1 goto bootstrap_error
) else (
  if not exist "%NODE_EXE%" goto bootstrap_error
)
if /i not "%NODE_EXE%"=="node.exe" (
  for %%I in ("%NODE_EXE%") do set "PATH=%%~dpI;%PATH%"
)
chcp 65001 >nul
"%NODE_EXE%" "scripts\launch.mjs" %*
set "RC=%ERRORLEVEL%"
if not "%RC%"=="0" goto failed
goto done
:no_app
echo [ERROR] The Amayune application is not part of this download yet.
echo The settings application and launcher.config.json are in an unmerged PR.
echo See https://github.com/Aspksa/Amayune/pull/2
set "RC=2"
goto failed
:missing
echo [ERROR] Required launcher scripts are missing.
set "RC=2"
goto failed
:folder_error
echo [ERROR] Cannot access the Amayune folder.
set "RC=3"
goto failed
:bootstrap_error
echo [ERROR] Node.js initialization failed.
set "RC=4"
:failed
echo.
echo Check logs and README for details.
pause
:done
popd
endlocal & exit /b %RC%
