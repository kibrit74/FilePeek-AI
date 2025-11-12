@echo off
echo ========================================
echo FilePeek AI - UDF Dosya Destegi
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

echo UDF dosya tipi kaydediliyor...
regedit /s "%~dp0install-udf-support.reg"
echo.

echo Tum dosya tipleri icin menü ekleniyor...
regedit /s "%~dp0install-context-menu-packaged.reg"
echo.

echo Eski kayitlar temizleniyor...
regedit /s "%~dp0uninstall-context-menu-packaged.reg"
regedit /s "%~dp0install-context-menu-packaged.reg"
echo.

echo ========================================
echo BASARILI! UDF destegi eklendi.
echo ========================================
echo.
echo Artik UDF dosyalarina sag tiklayinca:
echo - "FilePeek AI ile Ac" goreceksin
echo - Cift tiklayinca otomatik FilePeek AI acilacak
echo.
echo Not: Explorer'i yeniden baslat (Ctrl+Shift+Esc)
echo.

pause



