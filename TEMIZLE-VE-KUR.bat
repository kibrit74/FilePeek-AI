@echo off
echo ========================================
echo FilePeek AI - Temiz Kurulum
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

echo 1. Eski kayitlar temizleniyor...
regedit /s "%~dp0uninstall-context-menu-packaged.reg"
echo    Tamamlandi!
echo.

echo 2. Yeni kayitlar ekleniyor...
regedit /s "%~dp0install-context-menu-packaged.reg"
echo    Tamamlandi!
echo.

echo ========================================
echo BASARILI! Sag tik menusu duzeltildi.
echo ========================================
echo.
echo Artik sadece "FilePeek AI ile Ac" goreceksin.
echo.
echo Not: Explorer'i yeniden baslat:
echo - Ctrl+Shift+Esc
echo - Windows Gezgini - Sag tik - Yeniden baslat
echo.

pause

