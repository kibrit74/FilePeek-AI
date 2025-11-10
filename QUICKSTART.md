# ⚡ Hızlı Başlangıç - 5 Dakikada KankaAI!

## 🎯 3 Basit Adım

### 1️⃣ API Anahtarı Al (2 dakika)

1. 🌐 https://aistudio.google.com/app/apikey adresine git
2. 🔑 "Create API Key" butonuna tıkla
3. 📋 Anahtarını kopyala

### 2️⃣ Anahtarı Yapıştır (1 dakika)

1. 📁 `kankaai` klasöründe `.env` dosyası oluştur
2. 📝 İçine şunu yaz:

```
GEMINI_API_KEY=buraya_kopyaladigin_anahtari_yapisitir
NODE_ENV=development
```

3. 💾 Kaydet

> **💡 İpucu:** `.env.example` dosyasını `.env` olarak kopyalayabilirsin!

### 3️⃣ Başlat (2 dakika)

**Yöntem 1: START.bat** (Önerilen - Windows)
- `START.bat` dosyasına çift tıkla
- Uygulama otomatik açılacak! 🚀

**Yöntem 2: Manuel**
```bash
npm install  # İlk seferde bir kez
npm start    # Uygulamayı başlat
```

---

## ✅ Hepsi Bu Kadar!

Uygulama açıldı! Şimdi:

1. 📁 "Dosya Seç" butonuna tıkla
2. 📄 PDF, Word, Excel, ZIP veya TXT dosyası seç
3. ✨ "Özetle" butonuna tıklayarak AI ile özetle!
4. 💬 Soru kutusuna bir soru yaz ve cevap al!

---

## 🆘 Sorun mu Var?

### "npm bulunamadı" hatası
➡️ [Node.js indir](https://nodejs.org/) (LTS sürümü önerilir)

### "GEMINI_API_KEY bulunamadı" hatası
➡️ `.env` dosyasının `kankaai/` klasöründe olduğundan emin ol

### Başka bir sorun?
➡️ [SETUP.md](SETUP.md) dosyasına detaylı talimatlar için bak

---

## 🎨 Örnek Kullanım Senaryoları

### 📄 PDF Özeti
1. Makale/rapor PDF'ini seç
2. "Özetle" → 5 saniyede önemli noktaları al!

### 💼 Excel Analizi
1. Satış tablosunu seç
2. Sor: "En yüksek satış hangi ayda?"

### 📊 Word Doküman İncelemesi
1. Sözleşme/teklif Word dosyasını seç
2. Sor: "Önemli maddeler neler?"

---

## 📦 Kurulum Dosyası Oluştur

Windows için .exe kurulum dosyası:

```bash
npm run dist
```

Kurulum sonrası:
- Dosyalara sağ tıkla → "KankaAI ile aç" seçeneği gelir! 🎉

---

**Hazır mısın? Başlayalım! 🚀**

