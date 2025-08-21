@echo off
echo Setting up YouTube Downloader for local development...

echo.
echo Installing frontend dependencies...
call npm install

echo.
echo Setting up backend virtual environment...
cd backend
if not exist venv (
    python -m venv venv
)

echo.
echo Activating virtual environment and installing backend dependencies...
call venv\Scripts\activate
pip install -r requirements.txt

echo.
echo Setup complete!
echo.
echo To run the application locally:
echo 1. Start the backend: cd backend ^&^& venv\Scripts\activate ^&^& python app.py
echo 2. In a new terminal, start the frontend: npm run dev
echo 3. Open http://localhost:3000 in your browser
echo.
pause
