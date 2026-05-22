@echo off
echo =======================================================
echo   Novel-Nexus - Setup and Startup Script
echo =======================================================
echo.

:: 1. Check and setup Python backend
echo [*] Checking Backend virtual environment...
if not exist "backend\venv" (
    echo [!] Virtual environment not found. Setting up Python venv...
    cd backend
    python -m venv venv
    if errorlevel 1 (
        echo [ERROR] Failed to create virtual environment. Please install Python.
        pause
        exit /b
    )
    echo [*] Installing backend dependencies...
    venv\Scripts\pip install -r requirements.txt
    cd ..
) else (
    echo [*] Backend virtual environment found.
)

:: 2. Check and setup Frontend Node modules
echo [*] Checking Frontend dependencies...
if not exist "frontend\node_modules" (
    echo [!] node_modules not found. Installing frontend dependencies...
    cd frontend
    call npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install npm packages. Please install Node.js.
        pause
        exit /b
    )
    cd ..
) else (
    echo [*] Frontend dependencies found.
)

echo.
echo =======================================================
echo   Starting Backend and Frontend Servers...
echo =======================================================
echo.

:: 3. Starting Backend FastAPI in a new window
echo [*] Starting Backend FastAPI in a new window...
start "Novel-Nexus Backend" cmd /k "cd backend && venv\Scripts\activate && uvicorn app.main:app --reload --port 8000"

:: 4. Starting Frontend Vite Dev Server here
echo [*] Starting Frontend Vite Dev Server here...
echo.
cd frontend
npm run dev -- --host
