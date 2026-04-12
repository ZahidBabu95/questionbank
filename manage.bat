@echo off
title QuestionShaper Management Tool
setlocal EnableDelayedExpansion

:: --- CONFIGURATION ---
echo [INIT] Starting QuestionShaper Management Tool...
echo.

:: 1. SEARCH FOR JDK 17
echo [INFO] Searching for JDK 17...
set "TARGET_JAVA_HOME="

if exist "C:\Program Files\Java\jdk-17" set "TARGET_JAVA_HOME=C:\Program Files\Java\jdk-17"
if not defined TARGET_JAVA_HOME (
    if exist "C:\Program Files\Java" (
        for /d %%D in ("C:\Program Files\Java\jdk-17*") do set "TARGET_JAVA_HOME=%%D"
    )
)
if not defined TARGET_JAVA_HOME (
    if exist "C:\Program Files\Eclipse Adoptium" (
        for /d %%D in ("C:\Program Files\Eclipse Adoptium\jdk-17*") do set "TARGET_JAVA_HOME=%%D"
    )
)

if not defined TARGET_JAVA_HOME (
    if defined JAVA_HOME (
        set "TARGET_JAVA_HOME=%JAVA_HOME%"
    ) else (
        echo [ERROR] JDK 17 not found. Please install JDK 17.
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

:: 3. SETUP PORTABLE NODE (Frontend)
set "NODE_HOME=%~dp0frontend\node"
if exist "%NODE_HOME%" (
    set "PATH=!NODE_HOME!;!PATH!"
    echo [INFO] Using Portable Node: !NODE_HOME!
) else (
    echo [WARNING] Portable Node not found in frontend/node.
)

:menu
cls
echo ===================================================
echo     QuestionShaper Project Management
echo ===================================================
echo.
echo  [1] Start Application (Backend + Frontend)
echo  [2] Stop Application (Safe Port Kill)
echo  [3] Build Production WAR
echo  [4] View Frontend
echo  [5] Exit
echo.
set /p choice="Select an option [1-5]: "

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
echo [INFO] Starting Backend on port 8080...
start "QuestionShaper Backend" cmd /k "set "JAVA_HOME=!JAVA_HOME!" && set "PATH=!PATH!" && cd backend && mvn spring-boot:run"

echo [INFO] Starting Frontend on port 5173...
start "QuestionShaper Frontend" cmd /k "set "PATH=!PATH!" && cd frontend && npm run dev"

echo [SUCCESS] Servers launched.
pause
goto menu

:stop_app
echo.
echo [INFO] Identifying and stopping the processes on ports 8080 and 5173...
set "found=0"

:: Kill process on 8080
for /f "tokens=5" %%a in ('netstat -aon ^| find ":8080" ^| find "LISTENING"') do (
    echo [INFO] Killing Backend Process (PID %%a)
    taskkill /f /pid %%a >nul 2>&1
    set "found=1"
)

:: Kill process on 5173
for /f "tokens=5" %%a in ('netstat -aon ^| find ":5173" ^| find "LISTENING"') do (
    echo [INFO] Killing Frontend Process (PID %%a)
    taskkill /f /pid %%a >nul 2>&1
    set "found=1"
)

if "!found!"=="0" (
    echo [INFO] No application running on those ports.
) else (
    echo [SUCCESS] All QuestionShaper processes stopped successfully.
)
pause
goto menu

:build_app
echo.
echo [WARNING] Please DO NOT save or edit files in IntelliJ/VSCode while building!
echo [INFO] Building Production WAR...
cd backend
call mvn clean package -DskipTests -Pprod
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Backend Build Failed! Please check the output above.
    cd ..
    pause
    goto menu
)
cd ..

if not exist "production" mkdir "production"
echo [INFO] Copying fresh ROOT.war to production folder...
copy /Y "backend\target\ROOT.war" "production\ROOT.war" >nul

echo.
echo [SUCCESS] Production Build Completed Successfully!
echo [INFO] Deploy file is ready at: production\ROOT.war
pause
goto menu

:view_app
start http://localhost:5173
goto menu

:end
exit
