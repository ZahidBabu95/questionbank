@echo off
setlocal
title QuestionShaperBackend
set "JAVA_HOME=C:\Program Files\Java\jdk-17"
set "PATH=%JAVA_HOME%\bin;%PATH%"

echo Starting QuestionShaper Backend...
echo Access at http://localhost:8080
echo Login with: zahid / Z@hid95 (after DB migration) or admin / password (if using mock)

java -jar backend/target/ROOT.war
pause
