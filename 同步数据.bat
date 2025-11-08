@echo off
chcp 65001 >nul
echo ========================================
echo   网站数据同步工具
echo   sites.json → sites-data.js
echo ========================================
echo.

node sync-data.js

echo.
echo ========================================
pause

