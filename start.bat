@echo off
echo ========================================
echo   Inventario y Balance - Startup
echo ========================================
echo.

REM Get the current directory
set PROJECT_DIR=%~dp0

REM Start Django backend
echo Starting Django backend server...
start "Django Backend" cmd /k "cd /d "%PROJECT_DIR%" && python manage.py runserver"

REM Wait a bit for backend to start
timeout /t 3 /nobreak >nul

REM Start React frontend
echo Starting React frontend server...
start "React Frontend" cmd /k "cd /d "%PROJECT_DIR%frontend" && npm run dev"

echo.
echo ========================================
echo   Servers started!
echo   Backend:  http://localhost:8000
echo   Frontend: http://localhost:5173
echo   Admin:    http://localhost:8000/admin
echo ========================================
echo.
pause
