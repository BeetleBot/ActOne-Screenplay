param(
  [string]$SourceIcon = "$PSScriptRoot\..\..\src-tauri\icons\icon.png",
  [string]$OutDir = "$PSScriptRoot\Assets"
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

New-Item -ItemType Directory -Path $OutDir -Force | Out-Null

$sizes = @{
  "StoreLogo"       = 50
  "Square44x44Logo" = 44
  "Square150x150Logo" = 150
  "Wide310x150Logo" = @(310, 150)
  "LargeSquareLogo" = 310
}

$source = [System.Drawing.Image]::FromFile($SourceIcon)
$bgColor = [System.Drawing.Color]::FromArgb(0x1a, 0x1b, 0x26)

foreach ($name in $sizes.Keys) {
  $size = $sizes[$name]
  $w = if ($size -is [array]) { $size[0] } else { $size }
  $h = if ($size -is [array]) { $size[1] } else { $size }
  $bmp = New-Object System.Drawing.Bitmap($w, $h)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.Clear($bgColor)
  $iconSize = [Math]::Min($w, $h) - 8
  if ($iconSize -gt 0) {
    $g.DrawImage($source, ($w - $iconSize) / 2, ($h - $iconSize) / 2, $iconSize, $iconSize)
  }
  $g.Dispose()
  $path = Join-Path $OutDir "$name.png"
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Output "Generated $path"
}

$source.Dispose()
Write-Output "All MSIX assets generated in $OutDir"
