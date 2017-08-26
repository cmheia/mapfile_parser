@echo off
node %~dp0\map_parse_gcc.js -a -w -W %*
if %ERRORLEVEL% neq 0 pause