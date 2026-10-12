@echo off
echo ========================================================
echo        Starting AI Study Assistant (Full Stack)
echo ========================================================

start "AI Study Assistant Backend (FastAPI)" cmd /k "cd backend && python run.py"
start "AI Study Assistant Frontend (React + Vite)" cmd /k "cd frontend && npm run dev"

echo.
echo Backend running at: http://localhost:8000
echo Backend API Docs:   http://localhost:8000/docs
echo Frontend running at: http://localhost:5173
echo.
echo Browser will open shortly...
timeout /t 3 >nul
start http://localhost:5173
