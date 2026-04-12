@echo off
setlocal

echo ====================================================
echo QuestionShaper Production Build Script
echo ====================================================

:: Use portable Maven if available, otherwise assume 'mvn' is in PATH
if exist "%~dp0maven-portable\apache-maven-3.9.6\bin\mvn.cmd" (
    set "MVN_CMD=%~dp0maven-portable\apache-maven-3.9.6\bin\mvn.cmd"
) else (
    set "MVN_CMD=mvn"
)

:: Ensure JAVA_HOME points to JDK 17 as required by the project
if exist "C:\Program Files\Java\jdk-17" (
    set "JAVA_HOME=C:\Program Files\Java\jdk-17"
)

echo [1/3] Navigating to backend and building production WAR...
cd /d "%~dp0backend"
call "%MVN_CMD%" clean package -DskipTests -Pprod

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Build failed! Please check the logs above.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [2/3] Moving ROOT.war to production directory...
cd /d "%~dp0"
if not exist "production" mkdir "production"
move /Y "backend\target\ROOT.war" "production\ROOT.war"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Failed to move ROOT.war.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [3/3] Done! production\ROOT.war is ready for deployment.
echo ----------------------------------------------------
echo Deployment instructions:
echo 1. Stop your live Tomcat server.
echo 2. Go to Tomcat's 'webapps' folder.
echo 3. Delete any existing 'ROOT' folder and 'ROOT.war'.
echo 4. Copy the new 'production\ROOT.war' to 'webapps'.
echo 5. Start Tomcat.
echo ----------------------------------------------------
pause
