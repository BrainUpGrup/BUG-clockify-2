@echo off
title Brain Up Mini-Timer Flotante
chcp 65001 >nul

echo ==========================================================
echo   BRAIN UP GRUP • VENTANA FLOTANTE ALWAYS-ON-TOP
echo ==========================================================
echo   Iniciando widget flotante de control horario...
echo   Esta ventana puede flotar en pantalla mientras trabajas
echo   en otras páginas (WordPress, Canva, Google Docs, etc.)
echo ==========================================================

set URL=http://localhost:3000/floating-timer

:: Intentar con Microsoft Edge
if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --app="%URL%" --window-size=380,180 --window-position=50,50
    exit /b
)

if exist "C:\Program Files\Microsoft\Edge\Application\msedge.exe" (
    start "" "C:\Program Files\Microsoft\Edge\Application\msedge.exe" --app="%URL%" --window-size=380,180 --window-position=50,50
    exit /b
)

:: Intentar con Google Chrome
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --app="%URL%" --window-size=380,180 --window-position=50,50
    exit /b
)

if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" --app="%URL%" --window-size=380,180 --window-position=50,50
    exit /b
)

:: Si no encuentra rutas estáticas, abrir navegador predeterminado
start "" "%URL%"
exit /b
