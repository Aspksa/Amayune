param([Parameter(Mandatory=$true)][string]$Root)
$ErrorActionPreference='Stop'
try {
  $config=(Get-Content -LiteralPath (Join-Path $Root 'launcher.config.json') -Raw | ConvertFrom-Json)
  if(-not $config.python.required){exit 0}
  $min=[version]$config.python.minimum
  $runtime=Join-Path $Root '.runtime'
  $candidates=@((Join-Path $runtime 'python\python.exe'))
  $system=Get-Command python.exe -ErrorAction SilentlyContinue
  if($system){$candidates+=$system.Source}
  foreach($bin in $candidates){
    if(-not(Test-Path -LiteralPath $bin -PathType Leaf)){continue}
    $v=& $bin -c "import sys;print('.'.join(map(str,sys.version_info[:3])))" 2>$null
    if($LASTEXITCODE -eq 0 -and [version]$v -ge $min){exit 0}
  }
  $manifestFile=Join-Path $Root 'runtime-manifest.json'
  if(-not(Test-Path -LiteralPath $manifestFile)){throw 'Pinned Python runtime manifest required.'}
  $item=(Get-Content -LiteralPath $manifestFile -Raw | ConvertFrom-Json).python
  if(-not $item -or $item.url -notmatch '^https://www\.python\.org/ftp/python/' -or $item.sha256 -notmatch '^[a-fA-F0-9]{64}$'){throw 'Invalid Python source or SHA-256.'}
  New-Item -ItemType Directory -Force -Path $runtime | Out-Null
  $zip=Join-Path $runtime 'python-download.zip'
  $stage=Join-Path $runtime 'python-staging'
  if(Test-Path -LiteralPath $stage){Remove-Item -LiteralPath $stage -Recurse -Force}
  Invoke-WebRequest -Uri $item.url -OutFile $zip -UseBasicParsing
  if((Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash -ine $item.sha256){throw 'Python SHA-256 mismatch.'}
  Expand-Archive -LiteralPath $zip -DestinationPath $stage
  $binary=Get-ChildItem -LiteralPath $stage -Filter python.exe -Recurse -File | Select-Object -First 1
  if(-not $binary){throw 'python.exe missing.'}
  $v=& $binary.FullName -c "import sys;print('.'.join(map(str,sys.version_info[:3])))"
  if([version]$v -lt $min){throw 'Python version mismatch.'}
  $dest=Join-Path $runtime 'python'
  if(Test-Path -LiteralPath $dest){throw 'Existing runtime is incompatible; refusing overwrite.'}
  Move-Item -LiteralPath $binary.Directory.FullName -Destination $dest
  exit 0
} catch {[Console]::Error.WriteLine("[PYTHON] $($_.Exception.Message)");exit 5}
