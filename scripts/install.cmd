@echo off
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Requesting administrative privileges...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process cmd -ArgumentList '/c', '\"\"%~f0\"\"' -Verb RunAs"
    exit /b
)

pushd "%~dp0"
call "%~dp0uninstall.cmd" --silent
echo [Ulanzi Web Video Control] Whitelisting extension fickakookgdjnejinipbbgohcbbaohef...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$c = Get-Content -LiteralPath '%~f0' -Raw; $c = $c -replace '(?s)^.*#powershell_start', ''; iex $c"
echo.
echo Registry whitelist installation completed.
echo Please restart your browser to apply the changes.
pause
exit /b

#powershell_start
$currentDir = Get-Location
$id = 'fickakookgdjnejinipbbgohcbbaohef'
$paths = @('HKLM:\SOFTWARE\Policies\Google\Chrome', 'HKLM:\SOFTWARE\Policies\Microsoft\Edge')

# Install whitelist
foreach ($p in $paths) {
    $allowlistPath = "$p\ExtensionInstallAllowlist"
    if (-not (Test-Path $allowlistPath)) { New-Item -Path $allowlistPath -Force | Out-Null }
    $exists = $false
    $props = Get-ItemProperty -Path $allowlistPath -ErrorAction SilentlyContinue
    if ($props) {
        foreach ($prop in $props.PSObject.Properties) {
            if ($prop.Value -eq $id) { $exists = $true; break }
        }
    }
    if (-not $exists) {
        $index = 1
        while ($true) {
            $val = Get-ItemProperty -Path $allowlistPath -Name $index -ErrorAction SilentlyContinue
            if ($null -eq $val) { break }
            $index++
        }
        Set-ItemProperty -Path $allowlistPath -Name $index -Value $id -Force | Out-Null
        Write-Host "Added $id to $allowlistPath at index $index"
    } else {
        Write-Host "$id already exists in $allowlistPath"
    }
    
    $sourcesPath = "$p\ExtensionInstallSources"
    if (-not (Test-Path $sourcesPath)) { New-Item -Path $sourcesPath -Force | Out-Null }
    $sourceExists = $false
    $sProps = Get-ItemProperty -Path $sourcesPath -ErrorAction SilentlyContinue
    if ($sProps) {
        foreach ($prop in $sProps.PSObject.Properties) {
            if ($prop.Value -eq 'file:///*') { $sourceExists = $true; break }
        }
    }
    if (-not $sourceExists) {
        $index = 1
        while ($true) {
            $val = Get-ItemProperty -Path $sourcesPath -Name $index -ErrorAction SilentlyContinue
            if ($null -eq $val) { break }
            $index++
        }
        Set-ItemProperty -Path $sourcesPath -Name $index -Value 'file:///*' -Force | Out-Null
        Write-Host "Added file:///* to $sourcesPath at index $index"
    } else {
        Write-Host "file:///* already exists in $sourcesPath"
    }
}

# Generate host-manifest.json and register Native Messaging Host to HKLM
$hostManifestPath = [System.IO.Path]::GetFullPath((Join-Path $currentDir "..\chrome-plugin\host-manifest.json"))
$batPath = [System.IO.Path]::GetFullPath((Join-Path $currentDir "..\chrome-plugin\host.bat"))
$escapedBatPath = $batPath.Replace('\', '\\')

$manifestContent = @"
{
  "name": "com.lsby.web_video_control",
  "description": "Ulanzi Deck controller host",
  "path": "$escapedBatPath",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://$id/"
  ]
}
"@

$manifestFolder = Split-Path -Path $hostManifestPath -Parent
if (-not (Test-Path $manifestFolder)) {
    New-Item -Path $manifestFolder -ItemType Directory -Force | Out-Null
}
[System.IO.File]::WriteAllText($hostManifestPath, $manifestContent)
Write-Host "Generated host-manifest.json at $hostManifestPath"

$hostRegistryPaths = @('HKLM:\SOFTWARE\Google\Chrome\NativeMessagingHosts\com.lsby.web_video_control', 'HKLM:\SOFTWARE\Microsoft\Edge\NativeMessagingHosts\com.lsby.web_video_control')

foreach ($regPath in $hostRegistryPaths) {
    if (-not (Test-Path $regPath)) { New-Item -Path $regPath -Force | Out-Null }
    Set-ItemProperty -Path $regPath -Name '(Default)' -Value $hostManifestPath -Force | Out-Null
    Write-Host "Registered Native Messaging Host at $regPath pointing to $hostManifestPath"
}

