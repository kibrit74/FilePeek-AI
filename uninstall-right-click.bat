@echo off
echo ========================================
echo FilePeek AI Sag Tik Menusu Kaldirma
echo ========================================
echo.

REM Yonetici yetkisi kontrolu
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo HATA: Bu script yonetici yetkisiyle calistirilmali!
    echo Sag tikla ve "Yonetici olarak calistir" secenegini kullan.
    echo.
    pause
    exit /b 1
)

echo Sag tik menusu kaldiriliyor...
echo.

REM Registry dosyasini uygula
regedit /s "%~dp0uninstall-context-menu.reg"

if %errorLevel% equ 0 (
    echo.
    echo ========================================
    echo BASARILI! Sag tik menusu kaldirildi.
    echo ========================================
    echo.
) else (
    echo.
    echo HATA: Registry kaydi silinemedi!
    echo.
)

pause

