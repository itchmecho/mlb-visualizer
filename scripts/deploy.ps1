# deploy.ps1 - Build, commit, and push in one command (Windows)
# Usage: .\scripts\deploy.ps1 "commit message"

param(
    [Parameter(Mandatory=$true, Position=0)]
    [string]$Message
)

$ErrorActionPreference = "Stop"

$Message = "$Message`n`nCo-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"

Write-Host "Building..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "Staging changes..." -ForegroundColor Cyan
git add -A

Write-Host "Committing..." -ForegroundColor Cyan
$env:SKIP_DEPLOY_CHECK = "1"
git commit -m $Message
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "Pushing..." -ForegroundColor Cyan
git push
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "Done!" -ForegroundColor Green
