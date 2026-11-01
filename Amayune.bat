@echo off
setlocal EnableExtensions DisableDelayedExpansion
call "%~dp0Project.bat" %*
exit /b %ERRORLEVEL%
