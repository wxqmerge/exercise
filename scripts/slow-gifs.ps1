# Slow down all GIFs in data/images by 2x (50% speed)
# Requires ffmpeg in PATH

$inDir = "D:\exercise\data\images"
$backupDir = "D:\exercise\data\images-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

Get-ChildItem $inDir -Filter *.gif | ForEach-Object {
    $src = $_.FullName
    $dst = Join-Path $backupDir $_.Name
    Copy-Item $src $dst
    $tmp = "$env:TEMP\$($_.BaseName)-slow.gif"
    # ffmpeg setpts doubles duration -> 0.5x speed
    ffmpeg -y -i $src -vf "setpts=2*PTS" -vsync 0 $tmp
    Move-Item -Force $tmp $src
    Write-Host "Slowed $($_.Name)"
}

Write-Host "Done. Backup at $backupDir"
