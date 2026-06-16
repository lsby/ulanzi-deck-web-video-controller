@echo off
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Requesting administrative privileges...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process cmd -ArgumentList '/c', '\"\"%~f0\"\"' -Verb RunAs"
    exit /b
)

pushd "%~dp0"
if "%1" neq "--silent" echo Cleaning up Ulanzi Web Video Control registry entries...

:: 1. Delete Native Messaging host configurations
reg delete "HKCU\Software\Microsoft\Edge\NativeMessagingHosts\com.lsby.web_video_control" /f >nul 2>&1
reg delete "HKCU\Software\Google\Chrome\NativeMessagingHosts\com.lsby.web_video_control" /f >nul 2>&1
reg delete "HKLM\Software\Microsoft\Edge\NativeMessagingHosts\com.lsby.web_video_control" /f >nul 2>&1
reg delete "HKLM\Software\Google\Chrome\NativeMessagingHosts\com.lsby.web_video_control" /f >nul 2>&1

:: 2. Delete Extension Policy Whitelist rules
if "%1" == "--silent" (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "$c = Get-Content -LiteralPath '%~f0' -Raw; $c = $c -replace '(?s)^.*#powershell_start', ''; iex $c" >nul 2>&1
) else (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "$c = Get-Content -LiteralPath '%~f0' -Raw; $c = $c -replace '(?s)^.*#powershell_start', ''; iex $c"
)

if "%1" neq "--silent" (
    echo.
    echo Registry cleanup completed.
    echo Please remove "Ulanzi Deck Video Controller" extension in your browser manually.
    pause
)
exit /b

#powershell_start
$currentDir = Get-Location
$id = 'fickakookgdjnejinipbbgohcbbaohef'
$paths = @('HKLM:\SOFTWARE\Policies\Google\Chrome', 'HKLM:\SOFTWARE\Policies\Microsoft\Edge')
foreach ($p in $paths) {
    $allowlistPath = "$p\ExtensionInstallAllowlist"
    if (Test-Path $allowlistPath) {
        $props = Get-ItemProperty -Path $allowlistPath -ErrorAction SilentlyContinue
        if ($props) {
            foreach ($prop in $props.PSObject.Properties) {
                if ($prop.Value -eq $id) {
                    Remove-ItemProperty -Path $allowlistPath -Name $prop.Name -Force | Out-Null
                    Write-Host "Removed $id from $allowlistPath"
                }
            }
        }
    }
    
    $sourcesPath = "$p\ExtensionInstallSources"
    if (Test-Path $sourcesPath) {
        $sProps = Get-ItemProperty -Path $sourcesPath -ErrorAction SilentlyContinue
        if ($sProps) {
            foreach ($prop in $sProps.PSObject.Properties) {
                if ($prop.Value -eq 'file:///*') {
                    Remove-ItemProperty -Path $sourcesPath -Name $prop.Name -Force | Out-Null
                    Write-Host "Removed file:///* from $sourcesPath"
                }
            }
        }
    }
}

# Delete generated host-manifest.json
$hostManifestPath = [System.IO.Path]::GetFullPath((Join-Path $currentDir "..\chrome-plugin\host-manifest.json"))
if (Test-Path $hostManifestPath) {
    Remove-Item -Path $hostManifestPath -Force | Out-Null
    Write-Host "Deleted manifest file at $hostManifestPath"
}
