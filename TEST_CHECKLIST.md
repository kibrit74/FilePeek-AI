# ✅ KankaAI Test Kontrol Listesi

## 🔧 Kurulum Testleri

- [ ] Node.js kurulu mu? (`node --version`)
- [ ] npm kurulu mu? (`npm --version`)
- [ ] `npm install` başarıyla çalıştı mı?
- [ ] `.env` dosyası oluşturuldu mu?
- [ ] `GEMINI_API_KEY` tanımlandı mı?

## 🚀 Başlatma Testleri

- [ ] `npm start` ile uygulama açılıyor mu?
- [ ] Pencere düzgün görünüyor mu?
- [ ] Header ve logo görünüyor mu?
- [ ] "Dosya Seç" butonu çalışıyor mu?
- [ ] Sürükle-bırak alanı görünüyor mu?

## 📁 Dosya Okuma Testleri

### PDF Dosyası
- [ ] PDF dosyası seçilebiliyor mu?
- [ ] Sayfa sayısı gösteriliyor mu?
- [ ] İlk birkaç satır önizleniyor mu?
- [ ] Tam metin AI'ya gönderilebiliyor mu?

### Word Belgesi (.docx)
- [ ] Word dosyası seçilebiliyor mu?
- [ ] Metin düzgün çıkartılıyor mu?
- [ ] Türkçe karakterler düzgün görünüyor mu?
- [ ] Önizleme ekranı düzgün formatlanmış mı?

### Excel Tablosu (.xlsx)
- [ ] Excel dosyası seçilebiliyor mu?
- [ ] Sayfa isimleri listeleniyor mu?
- [ ] İlk 10 satır tablo olarak gösteriliyor mu?
- [ ] Hücreler düzgün parse ediliyor mu?

### ZIP Arşivi
- [ ] ZIP dosyası seçilebiliyor mu?
- [ ] İçerik listesi gösteriliyor mu?
- [ ] Dosya/klasör ikonları doğru mu?
- [ ] Dosya sayısı doğru gösteriliyor mu?

### Metin Dosyası (.txt, .md, .csv)
- [ ] TXT dosyası seçilebiliyor mu?
- [ ] Metin düzgün görünüyor mu?
- [ ] Uzun metinler kesilebiliyor mu?
- [ ] Encoding problemi yok mu? (ö, ü, ş, ğ)

## 🤖 AI Özellikleri Testleri

### Özetleme
- [ ] "Özetle" butonu görünüyor mu?
- [ ] Butona tıklanınca yükleme animasyonu geliyor mu?
- [ ] Özet başarıyla üretiliyor mu?
- [ ] Özet Türkçe mi?
- [ ] Özet anlamlı ve doğru mu?
- [ ] Hata durumunda mesaj gösteriliyor mu?

### Soru-Cevap
- [ ] Soru input alanı görünüyor mu?
- [ ] "Sor" butonu çalışıyor mu?
- [ ] Enter tuşu ile soru gönderilebiliyor mu?
- [ ] Cevap üretiliyor mu?
- [ ] Cevap belgeye dayalı mı?
- [ ] "Belgede yok" durumunu tespit ediyor mu?

## 🔒 Güvenlik ve Performans

- [ ] Hassas veri sunucuya gitmiyor mu?
- [ ] API anahtarı güvenli tutuluyor mu?
- [ ] Büyük dosyalar (>10MB) açılabiliyor mu?
- [ ] Uygulama donmadan çalışıyor mu?
- [ ] Bellek kullanımı makul mi?

## 🎨 UI/UX Testleri

- [ ] Butonlar hover'da efekt gösteriyor mu?
- [ ] Sürükle-bırak alanı highlight oluyor mu?
- [ ] Yükleniyor animasyonu düzgün çalışıyor mu?
- [ ] Hata mesajları okunabilir mi?
- [ ] Renkler ve fontlar uyumlu mu?
- [ ] Responsive mi? (pencere küçültülünce)

## 🖱️ Sağ Tık Entegrasyonu (Sadece Build Sonrası)

- [ ] `npm run dist` başarıyla çalıştı mı?
- [ ] `.exe` dosyası oluşturuldu mu?
- [ ] Kurulum başarılı mı?
- [ ] Dosyaya sağ tıklayınca "KankaAI" görünüyor mu?
- [ ] Sağ tıkla açma çalışıyor mu?
- [ ] Uygulama zaten açıksa yeni dosya yükleniyor mu?

## ⚠️ Hata Durumları

- [ ] Olmayan dosya seçince hata veriyor mu?
- [ ] API key yanlışsa uyarı geliyor mu?
- [ ] Internet bağlantısı yoksa mesaj gösteriliyor mu?
- [ ] Bozuk PDF/Word dosyası ile hata mesajı geliyor mu?
- [ ] Çok büyük dosyalarda uyarı var mı?

## 📊 Edge Case'ler

- [ ] Boş dosya açılınca ne oluyor?
- [ ] Şifreli PDF açılabiliyor mu?
- [ ] Eski Excel formatı (.xls) çalışıyor mu?
- [ ] Emoji içeren dosya isimleri problem çıkarıyor mu?
- [ ] Çok uzun dosya yolları çalışıyor mu?

## 🌐 Çoklu Dil Desteği

- [ ] Türkçe karakterler düzgün görünüyor mu?
- [ ] İngilizce belgeler işleniyor mu?
- [ ] Karışık dil (TR+EN) belgeler çalışıyor mu?

## 🔄 Süreklilik Testleri

- [ ] Birden fazla dosya arka arkaya açılabiliyor mu?
- [ ] Farklı türde dosyalar sırayla açılıyor mu?
- [ ] Uygulama uzun süre açık kalabiliyor mu?
- [ ] Bellek sızıntısı var mı?

---

## 📝 Notlar

Test sırasında karşılaşılan sorunları buraya not edin:

```
[Tarih - Saat] - Sorun açıklaması
```

---

## ✅ Onay

- [ ] Tüm kritik testler geçti
- [ ] Bilinen hatalar dokümante edildi
- [ ] Uygulama dağıtıma hazır

**Test Eden:** _________________
**Tarih:** _________________
**Versiyon:** v1.0.0

