param(
  [Parameter(Mandatory = $true, Position = 0)]
  [string]$Source,

  [Parameter(Mandatory = $false)]
  [string]$Host = "zubenko",

  [Parameter(Mandatory = $false)]
  [string]$RemoteDir = "/var/www/admin_page/avaya-files"
)

$resolvedSource = Resolve-Path -Path $Source -ErrorAction SilentlyContinue
if (-not $resolvedSource) {
  Write-Error "Source path not found: $Source"
  exit 1
}

$resolvedSource = $resolvedSource.Path

Write-Host "Ensuring remote directory exists: $RemoteDir"
& ssh $Host "mkdir -p '$RemoteDir'" | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Error "Failed to connect to host '$Host' or create remote directory."
  exit 1
}

Write-Host "Uploading: $resolvedSource -> $Host:$RemoteDir"

if (Test-Path -Path $resolvedSource -PathType Container) {
  & scp -r "${resolvedSource}\*" "${Host}:${RemoteDir}/"
} else {
  & scp "$resolvedSource" "${Host}:${RemoteDir}/"
}

if ($LASTEXITCODE -ne 0) {
  Write-Error "Upload failed."
  exit 1
}

Write-Host "Upload complete."