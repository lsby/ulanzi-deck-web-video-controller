@echo off
setlocal

:: 1. 默认安装路径
set "ULANZI_NODE=C:\Program Files (x86)\Ulanzi Studio\nodejs\node.exe"

:: 2. 尝试从注册表读取真实安装路径 (应对用户自定义安装目录的情况)
for /f "tokens=2*" %%A in ('reg query "HKLM\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\UlanziDeck" /v UninstallPath 2^>nul') do (
    set "ULANZI_NODE=%%B\nodejs\node.exe"
)

:: 3. 最终判断和执行
if exist "%ULANZI_NODE%" (
    "%ULANZI_NODE%" "%~dp0host.js" %*
) else (
    node "%~dp0host.js" %*
)

endlocal
