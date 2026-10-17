@echo off
cd /d "%~dp0"
if not exist venv\.ready (
  python -m venv venv
  venv\Scripts\pip install -r requirements.txt
  if errorlevel 1 (
    echo.
    echo Installation failed. Check that Python 3.9 or newer is installed and the internet is on, then run this file again.
    pause
    exit /b 1
  )
  echo ready> venv\.ready
)
venv\Scripts\python app.py
pause
