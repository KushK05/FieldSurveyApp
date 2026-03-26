@echo off
setlocal
cd /d "%~dp0"

if not exist ".env" (
  echo Copying .env.example to .env for first-time setup...
  copy /Y ".env.example" ".env" >nul
)

echo Starting FieldSurvey backend...
call npm start
