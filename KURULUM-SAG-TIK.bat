@echo off
echo ========================================
echo FilePeek AI Sag Tik Menusu Kurulumu
echo ========================================
echo.

REM Yonetici yetkisi kontrolu
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo HATA: Bu dosyayi SAG TIKLA ve "Yonetici olarak calistir" sec!
    echo.
    pause
    exit /b 1
)

echo Sag tik menusu ekleniyor...
echo.

REM Registry dosyasini uygula
regedit /s "%~dp0install-context-menu-packaged.reg"

if %errorLevel% equ 0 (
    echo.
    echo ========================================
    echo BASARILI! Sag tik menusu eklendi.
    echo ========================================
    echo.
    echo Artik UDF, PDF, resim dosyalarina sag tiklayinca
    echo "FilePeek AI ile Ac" secenegini goreceksin!
    echo.
    echo ONEMLI: Explorer'i yeniden baslatman gerekebilir.
    echo.
) else (
    echo.
    echo HATA: Registry kaydi yapilamadi!
    echo.
)

pause

