# 役員報酬シミュレーター — このフォルダだけで完結（API 8002 + UI 3002）
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

Write-Host "== setup ==" -ForegroundColor Cyan

# Frontend deps
if (-not (Test-Path "$root\node_modules")) {
  Write-Host "npm install ..."
  npm install
}

# Backend venv
$venvPy = "$root\backend\.venv\Scripts\python.exe"
if (-not (Test-Path $venvPy)) {
  Write-Host "python -m venv backend\.venv ..."
  Push-Location "$root\backend"
  python -m venv .venv
  .\.venv\Scripts\pip install -r requirements.txt
  Pop-Location
}

Write-Host "== start ==" -ForegroundColor Cyan
Write-Host "API  http://localhost:8002"
Write-Host "UI   http://localhost:3002"

Start-Process powershell -ArgumentList @(
  "-NoExit", "-NoProfile", "-Command",
  "Set-Location '$root\backend'; .\.venv\Scripts\uvicorn main:app --reload --host 127.0.0.1 --port 8002"
)
Start-Process powershell -ArgumentList @(
  "-NoExit", "-NoProfile", "-Command",
  "Set-Location '$root'; npm run dev"
)
