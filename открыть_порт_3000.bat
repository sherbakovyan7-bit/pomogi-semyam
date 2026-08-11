@echo off
rem Self-elevating script: opens TCP port 3000 in Windows Firewall
rem needed so the phone app can reach the server on 192.168.0.16:3000

net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Requesting administrator rights...
    powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

netsh advfirewall firewall delete rule name="PS-API-3000" >nul 2>&1
netsh advfirewall firewall add rule name="PS-API-3000" dir=in action=allow protocol=TCP localport=3000 profile=private,domain

netsh advfirewall firewall show rule name="PS-API-3000" | findstr /C:"PS-API-3000" >nul
if %errorlevel% equ 0 (
    echo OK: port 3000 is now open in the firewall.
) else (
    echo FAILED: rule was not created.
)
pause