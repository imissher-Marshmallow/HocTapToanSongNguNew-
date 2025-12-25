@echo off
REM Start Backend and Run Test
REM Usage: Run this file from the backend directory

echo.
echo ======================================================================
echo Starting Backend on Port 5000...
echo ======================================================================
echo.

REM Start backend in background
start "Backend Server" cmd /k "npm start"

REM Wait for server to start
echo Waiting 3 seconds for server to start...
timeout /t 3 /nobreak

REM Run test
echo.
echo ======================================================================
echo Running Profile Update Test...
echo ======================================================================
echo.

node test-userid-1.js

echo.
echo ======================================================================
echo Test Complete!
echo Backend is still running in another window (named "Backend Server")
echo ======================================================================
echo.
pause
