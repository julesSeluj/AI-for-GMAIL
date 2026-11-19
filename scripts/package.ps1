#Requires -Version 7
$ErrorActionPreference = 'Stop'

$manifest = Get-Content "$PSScriptRoot\..\src\manifest.json" -Raw | ConvertFrom-Json
$version = $manifest.version
$distDir = "$PSScriptRoot\..\dist"
$zipName = "ai-for-gmail-$version.zip"

if (-not (Test-Path $distDir)) { New-Item -ItemType Directory -Path $distDir | Out-Null }

$zipPath = Join-Path $distDir $zipName
if (Test-Path $zipPath) { Remove-Item $zipPath }

Compress-Archive -Path "$PSScriptRoot\..\src\*" -DestinationPath $zipPath

Write-Host "Created $zipPath"
