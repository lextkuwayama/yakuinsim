# 法定マスタ（CSV / JSON）を検証し、ローカル SQLite を再投入する。
# 本番反映は git push 後に Vercel が自動デプロイ（docs/master-data-update.md 参照）。

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$venvPy = "$root\backend\.venv\Scripts\python.exe"
if (-not (Test-Path $venvPy)) {
  Write-Host "backend\.venv がありません。先に .\start.ps1 を一度実行するか:" -ForegroundColor Yellow
  Write-Host "  cd backend; python -m venv .venv; .\.venv\Scripts\pip install -r requirements.txt"
  exit 1
}

$argsList = @()
if ($args -contains "--check-only") { $argsList += "--check-only" }

& $venvPy "$root\backend\scripts\update_masters.py" @argsList
exit $LASTEXITCODE
