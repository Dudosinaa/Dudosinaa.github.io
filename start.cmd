@echo off
setlocal
pushd "%~dp0"

where node >nul 2>nul
if not errorlevel 1 goto use_node

where py >nul 2>nul
if errorlevel 1 goto check_python
py -3 --version >nul 2>nul
if not errorlevel 1 goto use_py

:check_python
where python >nul 2>nul
if errorlevel 1 goto missing_runtime
python --version >nul 2>nul
if not errorlevel 1 goto use_python
goto missing_runtime

:use_node
echo Starting preview with Node.js.
node scripts\serve.mjs
goto finished

:use_py
echo Starting preview with Python.
echo Local: http://127.0.0.1:4173/
echo Stop: Ctrl+C
py -3 -m http.server 4173 --bind 127.0.0.1
goto finished

:use_python
echo Starting preview with Python.
echo Local: http://127.0.0.1:4173/
echo Stop: Ctrl+C
python -m http.server 4173 --bind 127.0.0.1
goto finished

:missing_runtime
echo No local HTTP runtime found. See README.md for setup instructions.
popd
exit /b 1

:finished
set "preview_exit_code=%errorlevel%"
popd
exit /b %preview_exit_code%
