@echo off
echo Starting AI PM Suite...

:: Start the Next.js Frontend in a new window
start "Frontend (Next.js)" cmd /c "cd web && npm run dev"

:: Start the FastAPI Backend in a new window (Installing packages first)
start "Backend (FastAPI)" cmd /k "cd backend && .\venv\Scripts\python -m pip install openai python-dotenv passlib python-jose python-multipart && .\venv\Scripts\python -m uvicorn main:app --reload --port 8000"

echo Servers are booting up! Please wait a few seconds and then go to http://localhost:3000
pause
