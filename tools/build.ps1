# Fallback build for PCs without Node.js. Same result as tools\build.js (without the syntax check and tests).
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File tools\build.ps1
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$utf8 = New-Object System.Text.UTF8Encoding($false)
function Read-Text($p) { [System.IO.File]::ReadAllText($p, $utf8) }

$stamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'

# ---- art embedded as data: URIs
$keys = @{ 'cars_sheet'='cars1'; 'cars_sheet_2'='cars2'; 'props_sheet'='props'; 'table_kitchen'='table_kitchen'; 'table_desk'='table_desk'; 'table_bench'='table_bench'; 'road'='road' }
$mime = @{ '.png'='image/png'; '.jpg'='image/jpeg'; '.jpeg'='image/jpeg'; '.webp'='image/webp' }
$artJs = '/* no art embedded */'
$artDir = Join-Path $root 'art'
$embedded = @()
if (Test-Path $artDir) {
  $parts = @()
  foreach ($f in (Get-ChildItem $artDir -File | Sort-Object Name)) {
    $ext = $f.Extension.ToLower(); $base = [System.IO.Path]::GetFileNameWithoutExtension($f.Name)
    if ($mime.ContainsKey($ext) -and $keys.ContainsKey($base)) {
      $b64 = [Convert]::ToBase64String([System.IO.File]::ReadAllBytes($f.FullName))
      $parts += ('"' + $keys[$base] + '":"data:' + $mime[$ext] + ';base64,' + $b64 + '"')
      $embedded += $f.Name
    }
  }
  if ($parts.Count -gt 0) { $artJs = 'const EMBEDDED_ART={' + ($parts -join ',') + '};' }
}

# ---- scripts in file-name order
$js = ''
foreach ($f in (Get-ChildItem (Join-Path $root 'src\js') -Filter *.js | Sort-Object Name)) { $js += (Read-Text $f.FullName) }

# ---- build stamp (output only)
$reStamp = "(?m)^const BUILD_STAMP='[^']*'; // BUILD_STAMP(?=\r?$)"
$reVer   = "(?m)^const BUILD_VERSION=[^;]*; // BUILD_VERSION(?=\r?$)"
if (-not [regex]::IsMatch($js, $reStamp) -or -not [regex]::IsMatch($js, $reVer)) { throw "BUILD_STAMP / BUILD_VERSION lines not found in src\js\00-core.js" }
$js = [regex]::Replace($js, $reStamp, "const BUILD_STAMP='$stamp'; // BUILD_STAMP")
$js = [regex]::Replace($js, $reVer, "const BUILD_VERSION=null; // BUILD_VERSION")

# ---- assemble
$html = Read-Text (Join-Path $root 'src\index.html')
$css  = (Read-Text (Join-Path $root 'src\styles.css')).TrimEnd("`n")
$html = $html.Replace('{{STYLE}}', $css).Replace('{{ART}}', $artJs).Replace('{{SCRIPT}}', $js.TrimEnd("`n"))
$outDir = Join-Path $root 'dist'
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }
$out = Join-Path $outDir 'tabletop-racers.html'
[System.IO.File]::WriteAllText($out, $html, $utf8)
Write-Host ("Built dist\tabletop-racers.html  (" + [int]((Get-Item $out).Length / 1KB) + " KB)")
Write-Host ("  build stamp " + $stamp)
if ($embedded.Count -gt 0) { Write-Host ("  art embedded: " + ($embedded -join ', ')) } else { Write-Host "  art embedded: none" }
