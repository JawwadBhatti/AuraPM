@echo off
echo Cleaning up zombie servers to free ports...
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM python.exe >nul 2>&1

echo Cleaning Next.js Cache for styling fixes...
if exist "web\.next" rmdir /S /Q "web\.next"

echo Start Frontend...
start "Frontend (Next.js)" cmd /k "cd web && npm run dev"

echo Start Backend...
start "Backend (FastAPI)" cmd /k "cd backend && .\venv\Scripts\python -m pip install passlib python-jose python-multipart && .\venv\Scripts\python -m uvicorn main:app --reload --port 8000"

echo All Servers Rebooted!
pause
