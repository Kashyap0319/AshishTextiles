@echo off
setlocal enabledelayedexpansion

:: ==========================================
:: Busy Software Auto-Export Script
:: ==========================================
:: Configuration:
:: Change these to match the Busy installation on the client's PC
set BUSY_EXE="C:\Busy\Busy.exe"
set OUTPUT_DIR="C:\BusyExports"
set DATE_STAMP=%date:~-4%-%date:~4,2%-%date:~7,2%

:: Ensure output directory exists
if not exist %OUTPUT_DIR% mkdir %OUTPUT_DIR%

echo [%time%] Starting Busy Data Export...

:: 1. Export Stock Summary
echo [%time%] Exporting Stock Summary...
%BUSY_EXE% /EXPORT /REPORT:"Stock Summary" /FORMAT:XLSX /OUTPUT:"%OUTPUT_DIR%\stock_%DATE_STAMP%.xlsx"

:: 2. Export Sales Register (Current Fiscal Year)
echo [%time%] Exporting Sales Register...
%BUSY_EXE% /EXPORT /REPORT:"Sales Register" /FROM:01-04-2025 /TO:31-03-2026 /FORMAT:XLSX /OUTPUT:"%OUTPUT_DIR%\sales_%DATE_STAMP%.xlsx"

:: 3. Export Purchase Register
echo [%time%] Exporting Purchase Register...
%BUSY_EXE% /EXPORT /REPORT:"Purchase Register" /FROM:01-04-2025 /TO:31-03-2026 /FORMAT:XLSX /OUTPUT:"%OUTPUT_DIR%\purchase_%DATE_STAMP%.xlsx"

echo [%time%] All exports completed successfully.
echo Files are located in: %OUTPUT_DIR%
pause
