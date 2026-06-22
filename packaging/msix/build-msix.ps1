param(
    [string]$AppVersion = "",
    [string]$OutputDir = "",
    [string]$PfxPath = "",
    [string]$PfxPassword = ""
)

$ErrorActionPreference = "Stop"

$ProjectRoot = Resolve-Path "$PSScriptRoot\..\.."
$ManifestTemplate = "$PSScriptRoot\AppxManifest.xml"
$BinarySource = "$ProjectRoot\src-tauri\target\release\actone.exe"
$AssetSource = "$ProjectRoot\src-tauri\icons"

$StagingDir = "$PSScriptRoot\staging"
$StagingAssets = "$StagingDir\Assets"

if (-not (Test-Path $BinarySource)) {
    Write-Error "Binary not found at $BinarySource. Build first: npm run tauri build -- --no-bundle"
    exit 1
}

if (-not $AppVersion) {
    $config = Get-Content "$ProjectRoot\src-tauri\tauri.conf.json" | ConvertFrom-Json
    $AppVersion = $config.version
}

if (-not $OutputDir) {
    $OutputDir = "$ProjectRoot\src-tauri\target\msix"
}
New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null

New-Item -ItemType Directory -Path $StagingAssets -Force | Out-Null

Copy-Item $BinarySource $StagingDir\actone.exe -Force

$manifest = Get-Content $ManifestTemplate -Raw
$manifest = $manifest -replace 'Version="0\.0\.0\.0"', "Version=`"$AppVersion.0`""
Set-Content "$StagingDir\AppxManifest.xml" $manifest -NoNewline

$AssetFiles = @("StoreLogo.png", "Square150x150Logo.png", "Square44x44Logo.png", "Square310x310Logo.png", "Wide310x150Logo.png")
foreach ($file in $AssetFiles) {
    $src = "$AssetSource\$file"
    if (Test-Path $src) {
        Copy-Item $src "$StagingAssets\$file" -Force
    } else {
        Write-Warning "Missing asset: $src"
    }
}

$SdkRoot = "${env:ProgramFiles(x86)}\Windows Kits\10\bin"
$MakeAppxDirs = Get-ChildItem "$SdkRoot\10.*" -Directory | Sort-Object Name -Descending
if (-not $MakeAppxDirs) {
    Write-Error "Windows SDK not found at $SdkRoot"
    exit 1
}
$MakeAppx = Join-Path $MakeAppxDirs[0].FullName "x64\MakeAppx.exe"
if (-not (Test-Path $MakeAppx)) {
    $MakeAppx = Join-Path $MakeAppxDirs[0].FullName "x86\MakeAppx.exe"
}
if (-not (Test-Path $MakeAppx)) {
    Write-Error "MakeAppx.exe not found. Install Windows SDK."
    exit 1
}

$Filename = "ActOne_$AppVersion" + "_x64.msix"
$OutputMsix = Join-Path $OutputDir $Filename

Remove-Item $OutputMsix -ErrorAction SilentlyContinue
Write-Output "Building MSIX: $OutputMsix"
& $MakeAppx pack /p $OutputMsix /d $StagingDir /o
if ($LASTEXITCODE -ne 0) {
    Write-Error "MakeAppx failed with exit code $LASTEXITCODE"
    exit $LASTEXITCODE
}

Remove-Item "$StagingDir\actone.exe" -Force
Remove-Item "$StagingDir\AppxManifest.xml" -Force
Remove-Item "$StagingAssets\*" -Force -ErrorAction SilentlyContinue

Write-Output "MSIX created: $OutputMsix"

if ($PfxPath) {
    $SigntoolDirs = Get-ChildItem "$SdkRoot\10.*" -Directory | Sort-Object Name -Descending
    $Signtool = Join-Path $SigntoolDirs[0].FullName "x64\signtool.exe"
    if (-not (Test-Path $Signtool)) {
        $Signtool = Join-Path $SigntoolDirs[0].FullName "x86\signtool.exe"
    }
    if (Test-Path $Signtool) {
        $signArgs = @("sign", "/fd", "SHA256", "/f", $PfxPath)
        if ($PfxPassword) { $signArgs += "/p"; $signArgs += $PfxPassword }
        $signArgs += $OutputMsix
        Write-Output "Signing MSIX..."
        & $Signtool $signArgs
        if ($LASTEXITCODE -eq 0) {
            Write-Output "Signed successfully"
        } else {
            Write-Warning "Signing failed with exit code $LASTEXITCODE"
        }
    } else {
        Write-Warning "signtool.exe not found, skipping sign"
    }
}
