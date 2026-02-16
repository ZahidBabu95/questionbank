@echo off
title QuestionShaper Management Tool
setlocal EnableDelayedExpansion

:: --- CONFIGURATION ---
echo [INIT] Starting QuestionShaper Management Tool...
echo.

:: 1. SEARCH FOR JDK 17
echo [INFO] Searching for JDK 17...
set "TARGET_JAVA_HOME="

:: Check exact path
if exist "C:\Program Files\Java\jdk-17" set "TARGET_JAVA_HOME=C:\Program Files\Java\jdk-17"

:: Check for JDK 17 wildcard if not exact
if not defined TARGET_JAVA_HOME (
    if exist "C:\Program Files\Java" (
        for /d %%D in ("C:\Program Files\Java\jdk-17*") do set "TARGET_JAVA_HOME=%%D"
    )
)

:: Check Adoptium
if not defined TARGET_JAVA_HOME (
    if exist "C:\Program Files\Eclipse Adoptium" (
        for /d %%D in ("C:\Program Files\Eclipse Adoptium\jdk-17*") do set "TARGET_JAVA_HOME=%%D"
    )
)

:: If not found, warn but try to continue if JAVA_HOME is set externally
if not defined TARGET_JAVA_HOME (
    echo [WARNING] JDK 17 specific folder not found in standard locations.
    if defined JAVA_HOME (
        echo [INFO] Using existing JAVA_HOME: %JAVA_HOME%
        set "TARGET_JAVA_HOME=%JAVA_HOME%"
    ) else (
        echo [ERROR] JDK 17 not found and JAVA_HOME not set.
        echo Please install JDK 17.
        pause
        exit /b
    )
)

set "JAVA_HOME=!TARGET_JAVA_HOME!"
set "PATH=!JAVA_HOME!\bin;!PATH!"
echo [SUCCESS] Found JDK: !JAVA_HOME!

:: 2. SETUP MAVEN
set "MAVEN_HOME=%~dp0maven-portable"
set "MAVEN_BIN="

if exist "%MAVEN_HOME%\apache-maven-3.9.6\bin" set "MAVEN_BIN=%MAVEN_HOME%\apache-maven-3.9.6\bin"
if not defined MAVEN_BIN if exist "%MAVEN_HOME%\bin" set "MAVEN_BIN=%MAVEN_HOME%\bin"

if defined MAVEN_BIN (
    set "PATH=!MAVEN_BIN!;!PATH!"
    echo [INFO] Using Portable Maven: !MAVEN_BIN!
) else (
    echo [WARNING] Portable Maven not found. Using system Maven.
)

:menu
cls
echo ===================================================
echo     QuestionShaper Project Management
echo ===================================================
echo.
echo  [1] Start Application (Backend + Frontend)
echo  [2] Stop Application (Kill Ports)
echo  [3] Build Application (Clean Install + Build)
echo  [4] View Frontend (Open Browser)
echo  [5] Exit
echo.
set /p choice=Select an option [1-5]: 

if "%choice%"=="1" goto start_app
if "%choice%"=="2" goto stop_app
if "%choice%"=="3" goto build_app
if "%choice%"=="4" goto view_app
if "%choice%"=="5" goto end

echo Invalid choice.
pause
goto menu

:start_app
echo.
echo [INFO] Starting Backend...
:: Using quotes around the set command to handle spaces in paths (e.g. Program Files)
:: We use call to ensure the variables are expanded before being passed to the new cmd
start "QuestionShaper Backend" cmd /k "set "JAVA_HOME=!JAVA_HOME!" && set "PATH=!PATH!" && echo Using JAVA_HOME=!JAVA_HOME! && cd backend && mvn spring-boot:run"

echo [INFO] Starting Frontend...
start "QuestionShaper Frontend" cmd /k "set "PATH=!PATH!" && cd frontend && npm run dev"

echo [SUCCESS] Servers launched.
pause
goto menu

:stop_app
echo.
echo [INFO] Stopping ports 8080 and 5173...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":8080" ^| find "LISTENING"') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| find ":5173" ^| find "LISTENING"') do taskkill /f /pid %%a >nul 2>&1
echo [INFO] Cleaning up processes...
taskkill /f /im java.exe >nul 2>&1
taskkill /f /im node.exe >nul 2>&1
echo [SUCCESS] Stopped.
pause
goto menu

:build_app
echo.
echo [INFO] Building Backend...
cd backend
call mvn clean install -DskipTests
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Backend Build Failed!
    cd ..
    pause
    goto menu
)
cd ..

echo.
echo [INFO] Building Frontend...
cd frontend
call npm install
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Frontend Build Failed!
    cd ..
    pause
    goto menu
)
cd ..

echo [SUCCESS] Build Completed.
pause
goto menu

:view_app
start http://localhost:5173
goto menu

:end
exit
