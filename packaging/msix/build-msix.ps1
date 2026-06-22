param(
  [string]$Version = "0.1.15",
  [string]$Configuration = "release",
  [string]$Arch = "x64"
)

$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path "$PSScriptRoot\..\.."
$TauriTarget = "src-tauri\target\$Configuration"
$ReleaseExe = Join-Path $RepoRoot "$TauriTarget\ActOne.exe"
$StagingDir = Join-Path $RepoRoot "packaging\msix\staging"
$AssetsDir = Join-Path $PSScriptRoot "Assets"
$ManifestPath = Join-Path $PSScriptRoot "AppxManifest.xml"

if (-not (Test-Path $ReleaseExe)) {
  Write-Error "Release binary not found at $ReleaseExe. Run 'npm run tauri build' first."
  exit 1
}

Write-Output "=== Creating staging directory ==="
if (Test-Path $StagingDir) { Remove-Item -Recurse -Force $StagingDir }
New-Item -ItemType Directory -Path $StagingDir -Force | Out-Null
New-Item -ItemType Directory -Path "$StagingDir\Assets" -Force | Out-Null

Write-Output "=== Copying files ==="
Copy-Item $ReleaseExe "$StagingDir\actone.exe"

$IconSrc = Join-Path $RepoRoot "src-tauri\icons"
$iconFiles = @(
  "StoreLogo.png",
  "Square44x44Logo.png",
  "Square150x150Logo.png",
  "Square310x310Logo.png",
  "Wide310x150Logo.png"
)
foreach ($f in $iconFiles) {
  Copy-Item (Join-Path $IconSrc $f) "$StagingDir\Assets\"
}

$manifest = [System.IO.File]::ReadAllText($ManifestPath)
$manifest = $manifest -replace '(?<!xml\s)Version="\d+\.\d+\.\d+\.\d+"', "Version=`"$Version.0`""
$manifest = $manifest -replace 'MaxVersionTested="[^"]+"', 'MaxVersionTested="10.0.26100.0"'
[System.IO.File]::WriteAllText("$StagingDir\AppxManifest.xml", $manifest)

Write-Output "=== Creating MSIX ==="
$MakeAppx = "${env:ProgramFiles(x86)}\Windows Kits\10\bin\*\x64\MakeAppx.exe"
$MakeAppxPath = Resolve-Path $MakeAppx | Select-Object -ExpandProperty Path

$OutputMsix = Join-Path $PSScriptRoot "ActOne_${Version}_${Arch}.msix"

if (Test-Path $OutputMsix) { Remove-Item $OutputMsix -Force }

& $MakeAppxPath pack /p $OutputMsix /d $StagingDir /l
if ($LASTEXITCODE -ne 0) { throw "MakeAppx failed" }

Write-Output "=== MSIX created: $OutputMsix ==="
Write-Output ""
Write-Output "To sign:"
Write-Output "  signtool sign /fd SHA256 /a /f your-cert.pfx /p password $OutputMsix"
Write-Output ""
Write-Output "To install locally for testing:"
Write-Output "  Add-AppxPackage -Path $OutputMsix"
