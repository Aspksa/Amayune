@echo off
setlocal EnableExtensions
title Amayune
cd /d "%~dp0"

echo ========================================
echo                Amayune
echo ========================================
echo.

rem Run a built Windows executable when available.
if exist "Amayune.exe" (
    "Amayune.exe" %*
    goto :done
)
if exist "dist\Amayune.exe" (
    "dist\Amayune.exe" %*
    goto :done
)

rem Run a Node.js project if it defines a start or dev script.
if exist "package.json" (
    where node >nul 2>&1
    if errorlevel 1 goto :missing_node
    where npm >nul 2>&1
    if errorlevel 1 goto :missing_node
    for /f "delims=" %%S in ('node -e "let p=require('./package.json'); console.log(p.scripts?.start?'start':p.scripts?.dev?'dev':'')" 2^>nul') do set "NPM_SCRIPT=%%S"
    if defined NPM_SCRIPT (
        if not exist "node_modules" (
            echo Installing Node.js dependencies...
            call npm install
            if errorlevel 1 goto :failed
        )
        echo Starting npm script: %NPM_SCRIPT%
        call npm run %NPM_SCRIPT% -- %*
        goto :done
    )
)

rem Run a Python entry point.
if exist "main.py" (
    where py >nul 2>&1
    if not errorlevel 1 (
        py -3 "main.py" %*
        goto :done
    )
    where python >nul 2>&1
    if not errorlevel 1 (
        python "main.py" %*
        goto :done
    )
    echo Python 3 is required to run main.py.
    goto :failed
)

echo No supported Amayune entry point found.
echo Add Amayune.exe, dist\Amayune.exe, main.py,
echo or a package.json with a start/dev script.
goto :failed

:missing_node
echo Node.js and npm are required for this project.
goto :failed

:done
set "EXIT_CODE=%ERRORLEVEL%"
if not "%EXIT_CODE%"=="0" goto :failed
echo.
echo Amayune finished successfully.
goto :end

:failed
echo.
echo Amayune could not be started or exited with an error.
set "EXIT_CODE=1"

:end
echo.
pause
exit /b %EXIT_CODE%
