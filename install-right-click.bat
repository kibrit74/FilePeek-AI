@echo off
echo ========================================
echo FilePeek AI Sag Tik Menusu Kurulumu
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

echo Sag tik menusu ekleniyor...
echo.

REM Registry dosyasini uygula
regedit /s "%~dp0install-context-menu.reg"

if %errorLevel% equ 0 (
    echo.
    echo ========================================
    echo BASARILI! Sag tik menusu eklendi.
    echo ========================================
    echo.
    echo Artik PDF, Word, Excel, UDF ve resim dosyalarina
    echo sag tiklayinca "FilePeek AI ile Ac" secenegini goreceksin!
    echo.
) else (
    echo.
    echo HATA: Registry kaydi yapilamadi!
    echo.
)

pause

