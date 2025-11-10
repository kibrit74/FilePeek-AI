# 🚀 KankaAI Kurulum Rehberi

## 📋 Gereksinimler

- Node.js 18 veya üzeri
- npm (Node.js ile birlikte gelir)
- Gemini API anahtarı (ücretsiz)

## 🔧 Adım Adım Kurulum

### 1. Bağımlılıkları Yükleyin

```bash
cd kankaai
npm install
```

### 2. Gemini API Anahtarı Alın

1. [Google AI Studio](https://aistudio.google.com/app/apikey) adresine gidin
2. Google hesabınızla giriş yapın
3. "Create API Key" butonuna tıklayın
4. Anahtarınızı kopyalayın

### 3. .env Dosyası Oluşturun

Proje kök dizininde `.env` dosyası oluşturun:

```bash
# Windows PowerShell
Copy-Item .env.example .env
```

Sonra `.env` dosyasını açın ve API anahtarınızı ekleyin:

```
GEMINI_API_KEY=buraya_api_anahtarinizi_yapisitirin
NODE_ENV=development
```

### 4. Uygulamayı Başlatın

```bash
npm start
```

Uygulama açılacak ve dosya seçebileceksiniz!

## 🔨 Kurulum Dosyası Oluşturma

Windows için .exe kurulum dosyası:

```bash
npm run dist
```

Kurulum dosyası `dist/` klasöründe oluşacaktır.

## 🧪 Test

### Desteklenen Dosya Türlerini Test Edin:

1. ✅ PDF dosyası seçin
2. ✅ Word (.docx) dosyası seçin
3. ✅ Excel (.xlsx) dosyası seçin
4. ✅ ZIP dosyası seçin
5. ✅ TXT dosyası seçin

### AI Özelliklerini Test Edin:

1. Bir dosya seçtikten sonra "Özetle" butonuna tıklayın
2. Soru kutusuna bir soru yazın ve "Sor" butonuna tıklayın

## ❗ Sorun Giderme

### "Cannot find module" hatası

```bash
npm install
```

### "GEMINI_API_KEY bulunamadı" hatası

- `.env` dosyasının `kankaai/` klasöründe olduğundan emin olun
- API anahtarının doğru yapıştırıldığını kontrol edin
- Uygulamayı yeniden başlatın

### DevTools açmak için

`.env` dosyasında:
```
NODE_ENV=development
```

## 🎯 Sağ Tık Entegrasyonu

Kurulum dosyasını çalıştırdıktan sonra:

1. Herhangi bir PDF/Word/Excel dosyasına sağ tıklayın
2. "Birlikte aç" veya "Open with" seçeneğini seçin
3. KankaAI'yi seçin
4. Dosya otomatik olarak açılır!

## 🔐 Güvenlik Notları

- API anahtarınızı kimseyle paylaşmayın
- `.env` dosyasını Git'e commit etmeyin (.gitignore'da zaten var)
- Gemini API ücretsiz kullanımda günlük limit vardır

## 💡 İpuçları

- Büyük dosyalarda sadece ilk 15,000 karakter AI'ya gönderilir (maliyet optimizasyonu)
- API anahtarı olmadan da dosya önizleme çalışır (sadece AI özellikleri devre dışı kalır)
- ZIP içindeki dosyalar sadece listelenir, içerikleri okunamaz (gelecek güncelleme)

## 📚 Daha Fazla Bilgi

- [README.md](README.md) - Genel bilgi ve kullanım
- [package.json](package.json) - Proje bağımlılıkları
- [Gemini API Docs](https://ai.google.dev/docs) - API dokümantasyonu

---

**Keyifli kullanımlar! 🚀**

