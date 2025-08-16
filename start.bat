@echo off
echo Starting YouTube Downloader...

:: Start backend in new window
start cmd /k "cd backend && venv\Scripts\activate && python app.py"

:: Wait a moment for backend to start
timeout /t 3 /nobreak >nul

:: Start frontend in new window
start cmd /k "npm run dev"

:: Open browser after a delay
timeout /t 5 /nobreak >nul
start http://localhost:3000

echo Application started!
echo Frontend: http://localhost:3000
echo Backend: http://localhost:5000