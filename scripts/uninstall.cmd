@echo off
echo Cleaning up Ulanzi Web Video Control registry entries...
reg delete "HKCU\Software\Microsoft\Edge\NativeMessagingHosts\com.lsby.web_video_control" /f >nul 2>&1
reg delete "HKCU\Software\Google\Chrome\NativeMessagingHosts\com.lsby.web_video_control" /f >nul 2>&1
echo Registry cleanup completed.
echo Please remove "Ulanzi Deck Video Controller" extension in your browser manually.
pause
