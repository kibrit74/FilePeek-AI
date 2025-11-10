@echo off
echo.
echo ========================================
echo   🧠 KankaAI Başlatılıyor...
echo ========================================
echo.

REM .env dosyasını kontrol et
if not exist .env (
    echo ⚠️ HATA: .env dosyasi bulunamadi!
    echo.
    echo Lütfen şu adımları uygulayın:
    echo 1. .env.example dosyasını .env olarak kopyalayın
    echo 2. .env dosyasını açın
    echo 3. GEMINI_API_KEY= satırına API anahtarınızı ekleyin
    echo.
    echo API anahtarı için: https://aistudio.google.com/app/apikey
    echo.
    pause
    exit /b 1
)

REM node_modules kontrol et
if not exist node_modules (
    echo 📦 Bağımlılıklar yükleniyor...
    call npm install
    if errorlevel 1 (
        echo.
        echo ❌ Bağımlılıklar yüklenemedi!
        pause
        exit /b 1
    )
    echo.
    echo ✅ Bağımlılıklar yüklendi!
    echo.
)

echo 🚀 Uygulama başlatılıyor...
echo.
npm start

