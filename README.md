# 🧠FilePeek-AI - Dosya İçeriği Önizleme ve Yapay Zeka Asistanı

Dosyalarınızı açmadan içeriğini görün ve Gemini AI ile analiz edin!

## ✨ Özellikler

- 📄 **Dosya Önizleme**: PDF, Word, Excel, TXT, ZIP dosyalarını açmadan içeriğini görün
- 🤖 **AI Özetleme**: Gemini ile dosyaları hızlıca özetleyin
- 💬 **Soru-Cevap**: Dosya içeriği hakkında sorular sorun
- 🔒 **Güvenli**: Tüm işlemler cihazınızda gerçekleşir
- 🖱️ **Sağ Tık Entegrasyonu**: Dosyalara sağ tıklayarak direkt açın

## 📋 Desteklenen Dosya Türleri

- PDF (.pdf)
- UDF(.udf)
- Word (.docx)
- Excel (.xlsx, .xls)
- Metin (.txt, .md, .csv)
- ZIP (.zip)

## 🚀 Kurulum

### 1. Gereksinimleri Yükleyin

```bash
npm install
```

### 2. Gemini API Anahtarı Alın

1. [Google AI Studio](https://aistudio.google.com/app/apikey) adresine gidin
2. Ücretsiz API anahtarınızı oluşturun
3. `.env` dosyasını açın ve anahtarınızı ekleyin:

```
GEMINI_API_KEY=buraya_anahtarinizi_yapisitirin
```

### 3. Uygulamayı Başlatın

```bash
npm start
```

## 🔨 Geliştirme

### Geliştirme Modu

```bash
npm start
```

### Kurulum Dosyası Oluşturma

Windows için .exe dosyası oluşturmak:

```bash
npm run build
```

Tüm platformlar için:

```bash
npm run dist
```

Kurulum dosyası `dist/` klasöründe oluşacaktır.

## 📖 Kullanım

1. **Dosya Seçin**: "Dosya Seç" butonuna tıklayın veya dosyayı sürükleyip bırakın
2. **Önizleme**: Dosya içeriği otomatik olarak gösterilir
3. **AI Özetleme**: "Özetle" butonuna tıklayarak hızlı özet alın
4. **Soru Sorun**: Metin kutusuna sorunuzu yazın ve "Sor" butonuna tıklayın

### Sağ Tık ile Açma

Kurulum yaptıktan sonra:
1. Herhangi bir PDF/Word/Excel dosyasına sağ tıklayın
2. "Birlikte aç" → "KankaAI" seçin
3. Dosya doğrudan uygulamada açılır!

## 🏗️ Proje Yapısı

```
kankaai/
├── src/
│   ├── main.js          # Electron ana süreç (dosya okuma)
│   ├── preload.js       # Güvenlik katmanı
│   ├── renderer/        # UI dosyaları
│   │   ├── index.html
│   │   ├── styles.css
│   │   └── app.js
│   └── utils/
│       └── ai.js        # Gemini AI entegrasyonu
├── .env                 # API anahtarları (GİZLİ)
└── package.json
```

## 🔒 Güvenlik ve Gizlilik

- ✅ Dosyalar cihazınızda işlenir, sunucuya gönderilmez
- ✅ Sadece metin içeriği Gemini API'ye gider (AI için)
- ✅ Geçici dosyalar otomatik silinir
- ✅ API anahtarınız güvende (.env dosyası)

## 🛠️ Teknolojiler

- **Electron**: Masaüstü uygulaması
- **Gemini AI**: Google'ın yapay zeka modeli
- **pdf-parse**: PDF okuma
- **mammoth**: Word okuma
- **xlsx**: Excel okuma
- **jszip**: ZIP okuma

## 💡 İpuçları

- Gemini API ücretsiz limiti: Günlük 50 istek
- Büyük dosyalarda ilk 15,000 karakter AI'ya gönderilir
- API anahtarı olmadan sadece önizleme çalışır (AI özellikleri çalışmaz)

## 🤝 Katkıda Bulunma

Pull request'ler hoş geldiniz! Büyük değişiklikler için lütfen önce issue açın.

## 📄 Lisans

MIT

## 🆘 Sorun Giderme

### "API key bulunamadı" hatası
- `.env` dosyasının proje kök dizininde olduğundan emin olun
- `GEMINI_API_KEY=` satırına anahtarınızı yapıştırdığınızı kontrol edin

### Dosya açılmıyor
- Dosya yolunda Türkçe karakter varsa sorun olabilir
- Dosyanın bozuk olmadığından emin olun

### Sağ tık menüsünde görünmüyor
- Uygulamayı `npm run build` ile kurulum dosyası oluşturup yükleyin
- Geliştirme modunda (`npm start`) sağ tık entegrasyonu çalışmaz

## 📧 İletişim

Sorular ve öneriler için issue açabilirsiniz!

---

**Not**: Bu proje GPT-4 ve Gemini AI ile geliştirilmiştir 🚀
