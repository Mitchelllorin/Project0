<#
Start the whole stack locally on Windows: FastAPI (8001) + React (3000).

  .\dev.ps1            install anything missing, then start both servers, each in its own window
  .\dev.ps1 check      report what this machine has and what is missing - changes nothing
  .\dev.ps1 install    install both dependency sets, start nothing

MongoDB is optional. The studio renders, prices and quotes from the JSON catalogs in
backend\catalog, so it runs with no database at all - only *saving* a design needs one.
Put a MONGO_URL in backend\.env (a local mongod, Docker, or a hosted one) to enable that.

If Windows refuses to run this file - "running scripts is disabled on this system", which
is what a downloaded ZIP looks like - run it this way instead:

  powershell -ExecutionPolicy Bypass -File .\dev.ps1

DEVELOPMENT.md has the manual version of every step this script performs.
#>

[CmdletBinding()]
param([ValidateSet('start', 'check', 'install')][string]$Command = 'start')

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$BackendPort = 8001
$FrontendPort = 3000
$MongoPort = 27017

function Have([string]$exe) { [bool](Get-Command $exe -ErrorAction SilentlyContinue) }

function Get-YarnCommand {
  # Yarn 1.22 is what packageManager declares. Prefer a real yarn; otherwise run that same
  # version through corepack, which needs no shims on PATH.
  if (Have 'yarn') { return 'yarn' }
  if (Have 'corepack') { return 'corepack yarn' }
  return $null
}

function Invoke-Yarn {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Rest)
  if (Have 'yarn') { & yarn @Rest } else { & corepack yarn @Rest }
}

function Resolve-Python {
  if (Have 'python') { $script:PyExe = 'python'; $script:PyPrefix = @(); return $true }
  if (Have 'py') { $script:PyExe = 'py'; $script:PyPrefix = @('-3'); return $true }
  return $false
}

function Invoke-Python {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Rest)
  & $script:PyExe @($script:PyPrefix + $Rest)
}

function Test-PortBusy([int]$Port) {
  return [bool](Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
}

function Get-MongoUrl {
  $envFile = Join-Path $root 'backend\.env'
  if (-not (Test-Path $envFile)) { return '' }
  $found = Select-String -Path $envFile -Pattern '^\s*MONGO_URL\s*=(.*)$' | Select-Object -First 1
  if (-not $found) { return '' }
  return $found.Matches[0].Groups[1].Value.Trim().Trim('"')
}

function Show-Check {
  $missing = 0

  Write-Host '== toolchain =='
  if (Have 'node') { Write-Host ("node      " + (& node --version) + "   (needs 20 or newer)") }
  else { Write-Host 'node      MISSING - install Node 20 or newer from nodejs.org' -ForegroundColor Red; $missing++ }
  $yarn = Get-YarnCommand
  if ($yarn) { Write-Host ("yarn      " + (Invoke-Yarn --version) + "   (via $yarn)") }
  else { Write-Host 'yarn      MISSING - install Node 20 or newer, which ships corepack' -ForegroundColor Red; $missing++ }
  if (Resolve-Python) { Write-Host ("python    " + (Invoke-Python --version) + "   (needs 3.11 or newer)") }
  else { Write-Host 'python    MISSING - install Python 3.11 or newer from python.org' -ForegroundColor Red; $missing++ }

  Write-Host ''
  Write-Host '== this checkout =='
  foreach ($side in @('backend', 'frontend')) {
    $envFile = Join-Path $root "$side\.env"
    if (Test-Path $envFile) { Write-Host "$side\.env            present" }
    else { Write-Host "$side\.env            missing - .\dev.ps1 install creates it" }
  }
  if (Test-Path (Join-Path $root 'backend\.venv')) { Write-Host 'backend\.venv        present' }
  else { Write-Host 'backend\.venv        missing - .\dev.ps1 install creates it' }
  if (Test-Path (Join-Path $root 'frontend\node_modules')) { Write-Host 'frontend\node_modules present' }
  else { Write-Host 'frontend\node_modules missing - .\dev.ps1 install creates it' }

  Write-Host ''
  Write-Host '== ports =='
  foreach ($port in @($BackendPort, $FrontendPort, $MongoPort)) {
    if (Test-PortBusy $port) { Write-Host "$port  in use" } else { Write-Host "$port  free" }
  }

  Write-Host ''
  Write-Host '== database =='
  $url = Get-MongoUrl
  if ($url) {
    Write-Host "MONGO_URL is set ($url) - saving and reloading designs is available."
    if (-not (Test-PortBusy $MongoPort) -and $url -match '127\.0\.0\.1|localhost') {
      Write-Host 'Nothing is listening on 27017 yet. Start MongoDB (or Docker) before saving.' -ForegroundColor Yellow
    }
  }
  else {
    Write-Host 'MONGO_URL is not set - the studio will run; saving a design will not.'
    Write-Host 'That is fine for looking and demoing. See DEVELOPMENT.md for enabling it.'
  }

  Write-Host ''
  if ($missing -eq 0) { Write-Host '== nothing blocking - .\dev.ps1 should start the stack ==' }
  else { Write-Host '== install what is missing above, then run .\dev.ps1 ==' }
}

function Install-Backend {
  Push-Location (Join-Path $root 'backend')
  try {
    if (-not (Test-Path '.env')) { Copy-Item '.env.example' '.env' }
    $venvPython = '.venv\Scripts\python.exe'
    if (-not (Test-Path $venvPython)) {
      # A .venv without a Windows interpreter in it is either absent or half-made; either way
      # the answer is the same, and for python -m venv it is safe to run over an existing one.
      if (-not (Resolve-Python)) { throw 'Neither python nor py is on PATH. Install Python 3.11 or newer from python.org.' }
      Invoke-Python -m venv .venv
      if (-not (Test-Path $venvPython)) { throw "Could not create backend\.venv - see the venv output above." }
    }
    & $venvPython -m pip install -q -r requirements-dev.txt
    if ($LASTEXITCODE -ne 0) { throw 'pip install failed - see the output above.' }
  }
  finally { Pop-Location }
}

function Install-Frontend {
  Push-Location (Join-Path $root 'frontend')
  try {
    if (Test-Path 'node_modules') { return }
    if (-not (Get-YarnCommand)) { throw 'Neither yarn nor corepack is available. Install Node 20 or newer.' }
    if (-not (Test-Path '.env')) { Copy-Item '.env.example' '.env' }

    Invoke-Yarn install --frozen-lockfile
    if ($LASTEXITCODE -eq 0) { return }

    # The one failure that is not your fault: the two @emergentbase/* dev-server packages are
    # URL dependencies on a vendor CDN, and yarn v1 refuses to fail softly on them. They are
    # editor tooling - the studio builds and runs without them, with two warnings.
    Write-Host ''
    Write-Host '!! yarn install failed - retrying without the cloud-only editor tooling'
    Write-Host '   (@emergentbase/overlay, @emergentbase/visual-edits: see DEVELOPMENT.md)'

    $keep = Join-Path $env:TEMP ('ks-manifests-' + [guid]::NewGuid())
    New-Item -ItemType Directory -Path $keep | Out-Null
    Copy-Item 'package.json', 'yarn.lock' $keep
    $strip = "const fs=require('fs');const p=JSON.parse(fs.readFileSync('package.json','utf8'));for (const n of ['@emergentbase/overlay','@emergentbase/visual-edits']) delete p.devDependencies[n];fs.writeFileSync('package.json', JSON.stringify(p, null, 2) + '\n');"
    & node -e $strip
    Invoke-Yarn install
    $status = $LASTEXITCODE
    # Put the manifest back exactly as it was, whether or not the retry worked.
    Copy-Item (Join-Path $keep 'package.json'), (Join-Path $keep 'yarn.lock') .
    Remove-Item -Recurse -Force $keep
    if ($status -eq 0) { Write-Host '==> installed without the editor tooling; package.json and yarn.lock are untouched' }
    else { throw 'The install failed for another reason - see the error above.' }
  }
  finally { Pop-Location }
}

function Start-Stack {
  if (-not (Test-Path (Join-Path $root 'backend\.venv'))) { Install-Backend }
  if (-not (Test-Path (Join-Path $root 'frontend\node_modules'))) { Install-Frontend }

  if (Test-PortBusy $BackendPort) { Write-Host "!! port $BackendPort is already in use - close whatever holds it first" -ForegroundColor Yellow }
  if (Test-PortBusy $FrontendPort) { Write-Host "!! port $FrontendPort is already in use - close whatever holds it first" -ForegroundColor Yellow }

  $python = Join-Path $root 'backend\.venv\Scripts\python.exe'
  $yarn = Get-YarnCommand

  $backendCmd = "`$Host.UI.RawUI.WindowTitle = 'Kitchen Studio - API (8001)'; Set-Location '$root\backend'; & '$python' -m uvicorn server:app --reload --port $BackendPort"
  $frontendCmd = "`$Host.UI.RawUI.WindowTitle = 'Kitchen Studio - studio (3000)'; Set-Location '$root\frontend'; `$env:BROWSER = 'none'; $yarn start"

  Start-Process powershell -ArgumentList @('-NoExit', '-Command', $backendCmd) | Out-Null

  Write-Host "==> API      http://localhost:$BackendPort"
  $url = Get-MongoUrl
  if ($url) { Write-Host '    database configured - designs can be saved' }
  else { Write-Host '    no MONGO_URL - the studio renders fine; saving is disabled' -ForegroundColor Yellow }

  Start-Process powershell -ArgumentList @('-NoExit', '-Command', $frontendCmd) | Out-Null
  Write-Host "==> studio   http://localhost:$FrontendPort    <-- open this one"

  Write-Host ''
  Write-Host 'Two new windows are starting. The first run of the studio takes a minute or two.'
  Write-Host 'Closing those two windows stops the stack.'
}

switch ($Command) {
  'check' { Show-Check }
  'install' {
    Install-Backend
    Install-Frontend
    Write-Host '==> dependencies installed; .\dev.ps1 to start'
  }
  default { Start-Stack }
}
