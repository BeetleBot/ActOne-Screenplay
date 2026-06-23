param(
    [string]$PfxPath = "",
    [string]$PfxPassword = "",
    [switch]$SelfSign,
    [switch]$SkipSigning,
    [string]$Version = ""
)

$ErrorActionPreference = "Stop"

# Self-elevate to admin if SelfSign is requested and we're not admin
$IsAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if ((-not $IsAdmin) -and $SelfSign) {
    $scriptPath = $MyInvocation.MyCommand.Path
    Start-Process -Verb RunAs -FilePath "powershell" -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", "`"$scriptPath`"", "-SelfSign"
    exit
}

$ProjectRoot = Resolve-Path "$PSScriptRoot\..\.."
$ArtifactsDir = "$ProjectRoot\Release\artifacts"

function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }

# --- Detect version ---
if (-not $Version) {
    $pkg = Get-Content "$ProjectRoot\package.json" | ConvertFrom-Json
    $currentVersion = $pkg.version
    $Version = Read-Host "Enter version number (current is $currentVersion, press Enter to keep)"
    if (-not $Version) {
        $Version = $currentVersion
    } else {
        # Update version in package.json
        $packageJsonPath = "$ProjectRoot\package.json"
        $content = Get-Content $packageJsonPath -Raw
        $content = $content -replace '(?<="version"\s*:\s*")[^"]+(?=")', $Version
        [System.IO.File]::WriteAllText($packageJsonPath, $content)
        
        # Run sync-version.js to update Cargo.toml and tauri.conf.json
        Push-Location $ProjectRoot
        node sync-version.js
        Pop-Location
    }
}
$MsixVersion = "$Version.0"
Write-Step "Building ActOne v$Version"


# --- Step 1: Build Tauri app ---
Write-Step "Building Tauri app (release, no bundle)"
Push-Location $ProjectRoot
npm run tauri build -- --no-bundle
if ($LASTEXITCODE -ne 0) { throw "Tauri build failed" }
Pop-Location

# --- Step 2: Prepare MSIX layout ---
Write-Step "Preparing MSIX layout"
$Layout = "$ProjectRoot\target\msix\layout"
$AssetsDir = "$Layout\Assets"
if (Test-Path $Layout) { Remove-Item $Layout -Recurse -Force }
New-Item -ItemType Directory -Path $AssetsDir -Force | Out-Null

Copy-Item "$ProjectRoot\src-tauri\target\release\actone.exe" $Layout
Copy-Item "$PSScriptRoot\AppxManifest.xml" $Layout
Copy-Item "$ProjectRoot\src-tauri\icons\StoreLogo.png" $AssetsDir
Copy-Item "$ProjectRoot\src-tauri\icons\Square44x44Logo.png" $AssetsDir
Copy-Item "$ProjectRoot\src-tauri\icons\Square150x150Logo.png" $AssetsDir
Copy-Item "$ProjectRoot\src-tauri\icons\Wide310x150Logo.png" $AssetsDir
Copy-Item "$ProjectRoot\src-tauri\icons\Square310x310Logo.png" $AssetsDir

# --- Step 3: Stamp version into manifest ---
Write-Step "Stamping version $MsixVersion into manifest"
$xml = [xml](Get-Content "$Layout\AppxManifest.xml")
$xml.Package.Identity.Version = $MsixVersion
$xml.Save("$Layout\AppxManifest.xml")

# --- Step 4: Create MSIX with MakeAppx ---
Write-Step "Creating MSIX package"
$SdkRoot = "${env:ProgramFiles(x86)}\Windows Kits\10\bin"
$SdkDirs = Get-ChildItem "$SdkRoot\10.*" -Directory | Sort-Object Name -Descending
if (-not $SdkDirs) { throw "Windows SDK not found at $SdkRoot" }
$SdkBin = Join-Path $SdkDirs[0].FullName "x64"

$MakeAppx = "$SdkBin\MakeAppx.exe"
$MsixFile = "ActOne-$Version.msix"
$MsixPath = "$ArtifactsDir\$MsixFile"
New-Item -ItemType Directory -Path $ArtifactsDir -Force | Out-Null
Remove-Item $MsixPath -ErrorAction SilentlyContinue

Write-Host "  MakeAppx: $MakeAppx"
Write-Host "  Output:   $MsixPath"
& $MakeAppx pack /d $Layout /p $MsixPath /o
if ($LASTEXITCODE -ne 0) { throw "MakeAppx failed" }

# --- Step 5: Sign ---
$Signed = $false
if ($SkipSigning) {
    Write-Step "Skipping signing (unsigned - Store will sign)"
} elseif ($SelfSign) {
    Write-Step "Self-signing with matching certificate"
    $Subject = "CN=A5C810D1-3C33-4DED-95DA-33D6BC28A3B0"
    $existing = Get-ChildItem -Path "Cert:\CurrentUser\My" | Where-Object { $_.Subject -eq $Subject }
    if (-not $existing) {
        $cert = New-SelfSignedCertificate -Type Custom `
            -Subject $Subject `
            -KeySpec Signature `
            -KeyExportPolicy Exportable `
            -KeyUsage DigitalSignature `
            -TextExtension "2.5.29.37={text}1.3.6.1.5.5.7.3.3" `
            -CertStoreLocation "Cert:\CurrentUser\My" `
            -Provider "Microsoft Enhanced RSA and AES Cryptographic Provider" `
            -HashAlgorithm SHA256
        $store = New-Object System.Security.Cryptography.X509Certificates.X509Store "Root","LocalMachine"
        $store.Open("ReadWrite")
        $store.Add($cert)
        $store.Close()
        $pub = New-Object System.Security.Cryptography.X509Certificates.X509Store "TrustedPublisher","LocalMachine"
        $pub.Open("ReadWrite")
        $pub.Add($cert)
        $pub.Close()
        Write-Host "  Created and installed self-signed cert"
        $existing = $cert
    } else {
        $existing = $existing[0]
    }
    $Signtool = "$SdkBin\signtool.exe"
    & $Signtool sign /a /fd SHA256 /sha1 $existing.Thumbprint $MsixPath
    if ($LASTEXITCODE -eq 0) { $Signed = $true }
} elseif ($PfxPath) {
    Write-Step "Signing with provided PFX certificate"
    if (-not (Test-Path $PfxPath)) { throw "PFX file not found: $PfxPath" }
    $Signtool = "$SdkBin\signtool.exe"
    $signArgs = @("sign", "/fd", "SHA256", "/f", $PfxPath)
    if ($PfxPassword) { $signArgs += "/p"; $signArgs += $PfxPassword }
    $signArgs += $MsixPath
    & $Signtool $signArgs
    if ($LASTEXITCODE -eq 0) { $Signed = $true }
} else {
    Write-Step "WARNING: No signing option specified. MSIX will be unsigned."
    Write-Host "  Use -SkipSigning, -SelfSign, or -PfxPath/-PfxPassword"
}

if ($Signed) { Write-Host "  Signed successfully" -ForegroundColor Green }

# --- Step 6: Copy portable exe ---
Write-Step "Copying portable executable"
$PortableExe = "ActOne-Portable-x64-$Version.exe"
Copy-Item "$ProjectRoot\src-tauri\target\release\actone.exe" "$ArtifactsDir\$PortableExe"

# --- Step 7: Cleanup layout ---
Remove-Item $Layout -Recurse -Force

# --- Done ---
Write-Step "Done! Artifacts in: $ArtifactsDir"
Write-Host "  MSIX:       $MsixFile" -ForegroundColor Green
Write-Host "  Portable:   $PortableExe" -ForegroundColor Green
if (-not $Signed -and -not $SkipSigning -and -not $PfxPath -and -not $SelfSign) {
    Write-Host "  NOTE: MSIX is unsigned. Use -SkipSigning or -SelfSign or -PfxPath" -ForegroundColor Yellow
}
