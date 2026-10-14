@echo off
rem The studio's desktop icon runs this file. Nothing else needs to be running first.
rem
rem It starts whichever half of the stack is not already listening, waits for the studio to
rem actually answer on 3000 (a bound port is not the same thing), and then opens it in the
rem browser. Running it twice is harmless: the second run finds both halves up and only
rem opens the window.
rem
rem `-ExecutionPolicy Bypass` is for this one command. A checkout that arrived as a ZIP is
rem marked "from the internet" and PowerShell refuses to run it otherwise; nothing on the
rem machine is changed.
rem
rem The window closes itself on success. On failure it stays open with the reason on screen,
rem because a shortcut that flashes and disappears is what this file exists to replace.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0dev.ps1" launch
if errorlevel 1 (
  echo.
  echo The studio did not start. The message above says why.
  pause
)
