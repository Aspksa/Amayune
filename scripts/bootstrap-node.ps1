param([Parameter(Mandatory=$true)][string]$Root)
$ErrorActionPreference = 'Stop'
try {
  $runtime=Join-Path $Root '.runtime'
  New-Item -ItemType Directory -Force -Path $runtime | Out-Null
  $min=[version]'20.0.0'
  $pkg=Join-Path $Root 'package.json'
  if(Test-Path -LiteralPath $pkg) {
    $spec=(Get-Content -LiteralPath $pkg -Raw | ConvertFrom-Json).engines.node
    if($spec -match '(\d+)(?:\.(\d+))?(?:\.(\d+))?') {
      $a=$Matches[1];$b='0';$c='0'
      if($Matches[2]){$b=$Matches[2]};if($Matches[3]){$c=$Matches[3]}
      $min=[version]"$a.$b.$c"
    }
  }
  $candidates=@((Join-Path $runtime 'node\node.exe'))
  $system=Get-Command node.exe -ErrorAction SilentlyContinue
  if($system){$candidates+=$system.Source}
  foreach($bin in $candidates) {
    if(-not(Test-Path -LiteralPath $bin -PathType Leaf)){continue}
    $v=& $bin -p 'process.versions.node' 2>$null
    if($LASTEXITCODE -eq 0 -and [version]$v -ge $min) {
      Set-Content -LiteralPath (Join-Path $runtime 'node-path.txt') -Value $(if($bin -eq (Join-Path $runtime 'node\node.exe')){'.runtime\node\node.exe'}else{'node.exe'}) -Encoding ASCII
      exit 0
    }
  }
  $manifestFile=Join-Path $Root 'runtime-manifest.json'
  if(-not(Test-Path -LiteralPath $manifestFile)){throw 'Node.js missing. A pinned runtime-manifest.json is required.'}
  $item=(Get-Content -LiteralPath $manifestFile -Raw | ConvertFrom-Json).node
  if(-not $item -or $item.url -notmatch '^https://nodejs\.org/dist/' -or $item.sha256 -notmatch '^[a-fA-F0-9]{64}$'){throw 'Untrusted Node URL or missing SHA-256.'}
  $zip=Join-Path $runtime 'node-download.zip'
  $stage=Join-Path $runtime 'node-staging'
  if(Test-Path -LiteralPath $stage){Remove-Item -LiteralPath $stage -Recurse -Force}
  Invoke-WebRequest -Uri $item.url -OutFile $zip -UseBasicParsing
  if((Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash -ine $item.sha256){throw 'Node SHA-256 mismatch.'}
  Expand-Archive -LiteralPath $zip -DestinationPath $stage
  $binary=Get-ChildItem -LiteralPath $stage -Filter node.exe -Recurse -File | Select-Object -First 1
  if(-not $binary){throw 'node.exe missing in archive.'}
  $v=& $binary.FullName -p 'process.versions.node'
  if($LASTEXITCODE -ne 0 -or [version]$v -lt $min){throw 'Node version mismatch.'}
  $dest=Join-Path $runtime 'node'
  if(Test-Path -LiteralPath $dest){throw 'Existing runtime is incompatible. Refusing overwrite.'}
  Move-Item -LiteralPath $binary.Directory.FullName -Destination $dest
  Set-Content -LiteralPath (Join-Path $runtime 'node-path.txt') -Value '.runtime\node\node.exe' -Encoding ASCII
  exit 0
} catch { [Console]::Error.WriteLine("[NODE] $($_.Exception.Message)");exit 4 }
