# Windows x64 전용. 관리자 설치 없이 현재 폴더 안에 실행 환경을 모은다.
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$Root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
Set-Location $Root
if (-not [Environment]::Is64BitOperatingSystem -or $env:PROCESSOR_ARCHITECTURE -eq 'ARM64') { throw 'Windows x64 is required.' }
$Offline = Join-Path $Root '.offline'
New-Item -ItemType Directory -Force $Offline | Out-Null
Remove-Item "$Offline\READY.txt" -ErrorAction SilentlyContinue

function Download($Url, $Destination) {
    Invoke-WebRequest -UseBasicParsing -Uri $Url -OutFile $Destination
}
function Check-Exit($Step) {
    if ($LASTEXITCODE -ne 0) { throw "$Step failed ($LASTEXITCODE)." }
}

# Node 공식 체크섬으로 다운로드를 검증한다.
$NodeVersion = 'v24.20.0'
$NodeFile = "node-$NodeVersion-win-x64.zip"
$Base = "https://nodejs.org/dist/$NodeVersion"
Download "$Base/$NodeFile" "$Offline\node.zip"
Download "$Base/SHASUMS256.txt" "$Offline\node-checksums.txt"
$Entry = Get-Content "$Offline\node-checksums.txt" | Where-Object { $_ -match "  $([regex]::Escape($NodeFile))$" }
if (-not $Entry) { throw 'Node checksum missing.' }
$Expected = ($Entry -split '\s+')[0]
if ((Get-FileHash "$Offline\node.zip" -Algorithm SHA256).Hash -ne $Expected) { throw 'Node checksum mismatch.' }
Expand-Archive "$Offline\node.zip" $Offline -Force
if (Test-Path "$Offline\node") { Remove-Item "$Offline\node" -Recurse -Force }
Move-Item "$Offline\node-$NodeVersion-win-x64" "$Offline\node"
$env:PATH = "$Offline\node;$env:PATH"
$env:HUSKY = '0'
$env:BASE_URL = ''
$env:PLAYWRIGHT_BROWSERS_PATH = "$Offline\browsers"
& "$Offline\node\npm.cmd" ci --cache "$Offline\npm-cache" --no-audit --no-fund
Check-Exit 'npm install'
& "$Offline\node\node.exe" node_modules\playwright\cli.js install chromium
Check-Exit 'Chromium download'

# 표준 라이브러리 분석도구용 Python. pip 는 이 배포판에 설치하지 않는다.
Download 'https://www.python.org/ftp/python/3.12.10/python-3.12.10-embed-amd64.zip' "$Offline\python.zip"
Expand-Archive "$Offline\python.zip" "$Offline\python" -Force
$Signature = Get-AuthenticodeSignature "$Offline\python\python.exe"
if ($Signature.Status -ne 'Valid') { throw 'Python executable signature is not valid.' }
# runpy 로 실행하는 도구와 선택 패키지가 폴더 안에서만 import 되도록 한다.
@('python312.zip', '.', 'Lib\site-packages', 'import site') | Set-Content "$Offline\python\python312._pth" -Encoding ASCII
Expand-Archive 'tools\vdi\analysis-v3.zip' "$Offline\analysis" -Force

& "$Offline\node\node.exe" tools\vdi\verify.mjs
Check-Exit 'offline browser verification'
& "$Root\vdi.cmd" analysis
Check-Exit 'analysis selftest'
& "$Root\vdi.cmd" lint
Check-Exit 'lint'
& "$Root\vdi.cmd" test
Check-Exit 'tests'
# 캐시만으로 의존성을 재설치할 수 있는지 실제로 확인한다.
& "$Root\vdi.cmd" restore
Check-Exit 'offline dependency restore'
& "$Root\vdi.cmd" verify
Check-Exit 'verification after restore'
"Prepared on $(Get-Date -Format o)`nNode $NodeVersion / Python 3.12.10 / Windows x64" | Set-Content "$Offline\READY.txt"
Write-Host 'READY. Keep this entire folder. Run .\vdi.cmd start, then open http://localhost:4173 and http://localhost:4174'
