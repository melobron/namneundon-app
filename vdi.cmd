@echo off
setlocal
cd /d "%~dp0"
set "PATH=%~dp0.offline\node;%PATH%"
set "PLAYWRIGHT_BROWSERS_PATH=%~dp0.offline\browsers"
set "HUSKY=0"
set "BASE_URL="
if "%~1"=="prepare" goto prepare
if not exist ".offline\node\node.exe" (
  echo Run vdi.cmd prepare while online, or download the prepared Windows bundle.
  exit /b 1
)
if "%~1"=="start" goto start
if "%~1"=="verify" goto verify
if "%~1"=="test" goto test
if "%~1"=="lint" goto lint
if "%~1"=="analysis" goto analysis
if "%~1"=="python" goto python
if "%~1"=="notebook" goto notebook
if "%~1"=="shell" goto shell
if "%~1"=="restore" goto restore
if "%~1"=="" goto start
echo Commands: prepare start verify test lint analysis python notebook shell restore
exit /b 1
:prepare
powershell.exe -NoProfile -File "%~dp0tools\vdi\prepare.ps1"
exit /b %errorlevel%
:start
node tools\vdi\server.mjs
exit /b %errorlevel%
:verify
node tools\vdi\verify.mjs
exit /b %errorlevel%
:test
call npm.cmd test -- --workers=2
exit /b %errorlevel%
:lint
call npm.cmd run lint
exit /b %errorlevel%
:restore
call npm.cmd ci --offline --cache .offline\npm-cache --no-audit --no-fund
exit /b %errorlevel%
:analysis
if not exist ".offline\python\python.exe" exit /b 1
pushd .offline\analysis\dtestbed_v3
"%~dp0.offline\python\python.exe" -X utf8 -c "import sys,runpy; sys.path.insert(0,'.'); sys.argv=['run.py']+(sys.argv[2:] or ['selftest']); runpy.run_path('run.py',run_name='__main__')" %*
set "RESULT=%errorlevel%"
popd
exit /b %RESULT%
:python
"%~dp0.offline\python\python.exe" -X utf8
exit /b %errorlevel%
:notebook
"%~dp0.offline\python\python.exe" -X utf8 -m jupyterlab --no-browser --ip=127.0.0.1
exit /b %errorlevel%
:shell
set "PATH=%~dp0.offline\python;%PATH%"
cmd /k
