param(
    [string]$PfxPath = "",
    [string]$PfxPassword = "",
    [switch]$SelfSign,
    [switch]$SkipSigning,
    [switch]$Linux
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Resolve-Path "$PSScriptRoot"

function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }

# --- Detect platform ---
$IsWSL = (Get-CimInstance -ClassName Win32_ComputerSystem).Model -like "*WSL*"
$IsLinux = $Linux -or $IsWSL -or $env:OS -ne "Windows_NT"

if ($IsLinux) {
    Write-Step "Detected Linux/WSL environment"
    Write-Host "Running Linux tarball build..."
    Write-Host ""

    $wslPath = $ProjectRoot -replace '^([A-Z]):', '/mnt/$1'
    $wslPath = $wslPath -replace '\\', '/'

    $scriptPath = "$wslPath/Release/linux/build-tarball.sh"
    bash -c "cd '$wslPath' && chmod +x '$scriptPath' && '$scriptPath'"
    exit $LASTEXITCODE
}

# --- Windows: build MSIX + portable ---
Write-Step "Windows build — MSIX + Portable executable"
$msixArgs = @()
if ($SelfSign) { $msixArgs += "-SelfSign" }
if ($SkipSigning) { $msixArgs += "-SkipSigning" }
if ($PfxPath) { $msixArgs += "-PfxPath"; $msixArgs += $PfxPath }
if ($PfxPassword) { $msixArgs += "-PfxPassword"; $msixArgs += $PfxPassword }

& "$PSScriptRoot\windows\build-msix.ps1" @msixArgs

Write-Step "All done! Artifacts in Release\artifacts\"
Get-ChildItem "$ProjectRoot\Release\artifacts" | ForEach-Object { Write-Host "  $($_.Name)" }
