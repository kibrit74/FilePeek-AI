const { GoogleGenerativeAI } = require("@google/generative-ai");

// Gemini API anahtarını .env dosyasından al
const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.warn("⚠️ GEMINI_API_KEY bulunamadı! .env dosyasına ekleyin.");
}

const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

/**
 * Dosya içeriğini özetler (Excel için tüm sayfalar dahil)
 * @param {string} text - Özetlenecek metin (sample - her sayfadan örnek)
 * @returns {Promise<string>} - Özet metni
 */
async function summarize(text) {
  if (!genAI) {
    throw new Error("Gemini API anahtarı tanımlanmamış. .env dosyasını kontrol edin.");
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    // Excel mi kontrol et
    const isExcel = text.includes("=== SAYFA");
    
    const prompt = isExcel 
      ? `Aşağıdaki Excel belgesinin TÜM SAYFALARINI analiz ederek Türkçe özetini çıkar.
Her sayfa için:
- Sayfa adı ve içerik türü
- Sütun başlıkları (varsa)
- Toplam satır sayısı
- Önemli bulgular

Excel'de birden fazla sayfa varsa HER BİRİNİ ayrı ayrı özetle.

EXCEL DOSYASI:
${text}`
      : `Aşağıdaki belgenin ilk sayfasını Türkçe olarak 3-5 madde halinde özetle. 
Her madde kısa ve net olsun. Sadece önemli bilgileri içersin.

BELGE İÇERİĞİ:
${text}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
    
  } catch (error) {
    console.error("Gemini API hatası:", error);
    throw new Error(`AI özetleme başarısız: ${error.message}`);
  }
}

/**
 * Belge içeriği hakkında soru sorar ve cevap alır (TÜM DOSYAYI ANALİZ EDER)
 * @param {string} text - Belge içeriği (fullText - tüm dosya)
 * @param {string} question - Sorulacak soru
 * @returns {Promise<string>} - Cevap metni
 */
async function askQuestion(text, question) {
  if (!genAI) {
    throw new Error("Gemini API anahtarı tanımlanmamış. .env dosyasını kontrol edin.");
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    // Excel mi kontrol et
    const isExcel = text.includes("=== SAYFA");
    
    // TÜM dosyayı analiz et (100.000 karaktere kadar)
    const prompt = isExcel
      ? `Sen bir Excel veri analiz uzmanısın. Aşağıdaki Excel dosyasının TÜM SAYFALARINI detaylı şekilde tarayarak soruyu cevapla.

🔍 GELİŞMİŞ EXCEL ARAMA KURALLARI:

1. SAYFA TARAMA:
   - Her "=== SAYFA" işaretine dikkat et
   - Sayfa numarası ve adını not et
   - Tüm sayfaları sırayla tara

2. SÜTUN BAŞLIKLARI:
   - İlk satırı sütun başlıkları olarak algıla
   - Sütun adlarını belirt
   - Hangi sütunda aradığını söyle

3. VERİ EŞLEŞTIRME:
   - TAM EŞLEŞME: Sayıları birebir eşleştir
   - KISMİ EŞLEŞME: Eğer tam bulamazsan benzer verileri göster
   - BAĞLAM: Bulunan verinin çevresindeki satırları da göster

4. ÇOKLU SONUÇ:
   - Eğer birden fazla eşleşme varsa HEPSİNİ listele
   - Her eşleşme için: Sayfa adı + Satır numarası + Sütun adı
   - Toplam kaç eşleşme bulunduğunu belirt

5. SONUÇ FORMATI:
   ✅ BULUNDU:
      - Sayfa: [Sayfa Adı]
      - Satır: [Satır No]
      - Sütun: [Sütun Adı]
      - Değer: [Bulunan Veri]
      - Bağlam: [Aynı satırdaki diğer önemli bilgiler]
   
   ❌ BULUNAMADI:
      - "Bu veri bulunamadı"
      - Benzer veriler varsa göster
      - Hangi sayfalara bakıldığını belirt

6. AKILLI ARAMA:
   - Büyük/küçük harf duyarsız ara
   - Boşlukları göz ardı et
   - Tarih formatlarını anlamsallaştır (2019, 2019/01/01, vb.)
   - Sayısal değerlerde virgül/nokta farklarını tolere et

SORU: ${question}

EXCEL DOSYASI (TÜM SAYFALAR):
${text.slice(0, 100000)}`
      : `Aşağıdaki belgenin TAMAMINI analiz ederek soruyu Türkçe olarak cevapla.
Belgede geçen bilgilere göre detaylı cevap ver. Eğer belgede yoksa "Bu bilgi belgede bulunmuyor" de.

SORU: ${question}

BELGE TAMAMI:
${text.slice(0, 100000)}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
    
  } catch (error) {
    console.error("Gemini API hatası:", error);
    throw new Error(`AI soru-cevap başarısız: ${error.message}`);
  }
}

/**
 * Resim dosyasını analiz eder ve detaylı açıklama yapar
 * @param {Buffer} imageBuffer - Resim dosyası buffer
 * @param {string} mimeType - Resim MIME tipi (image/jpeg, image/png vb.)
 * @returns {Promise<string>} - Resim açıklaması
 */
async function analyzeImage(imageBuffer, mimeType) {
  if (!genAI) {
    throw new Error("Gemini API anahtarı tanımlanmamış. .env dosyasını kontrol edin.");
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    const prompt = `Bu resmi Türkçe olarak detaylıca betimle ve analiz et. Şunları yap:

1. Genel Bakış: Resimde ne görünüyor? (ana konu, ortam, renkler)
2. Detaylar: Önemli öğeler, nesneler, insanlar (varsa)
3. Bağlam: Resmin türü (fotoğraf, grafik, ekran görüntüsü, tablo, diyagram vb.)
4. Metin: Resimde yazı varsa oku ve belirt
5. Öneriler: Bu resim ne amaçla kullanılabilir?

Açıklaman net, detaylı ve Türkçe olsun.`;

    const imagePart = {
      inlineData: {
        data: imageBuffer.toString('base64'),
        mimeType: mimeType
      }
    };

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    return response.text();
    
  } catch (error) {
    console.error("Gemini Vision API hatası:", error);
    throw new Error(`Resim analizi başarısız: ${error.message}`);
  }
}

/**
 * Resim hakkında soru sorar
 * @param {Buffer} imageBuffer - Resim dosyası buffer
 * @param {string} mimeType - Resim MIME tipi
 * @param {string} question - Sorulacak soru
 * @returns {Promise<string>} - Cevap
 */
async function askImageQuestion(imageBuffer, mimeType, question) {
  if (!genAI) {
    throw new Error("Gemini API anahtarı tanımlanmamış. .env dosyasını kontrol edin.");
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    const prompt = `Bu resme bakarak şu soruyu Türkçe olarak cevapla: ${question}

Eğer cevap resimde yoksa "Bu bilgi resimde görünmüyor" de.`;

    const imagePart = {
      inlineData: {
        data: imageBuffer.toString('base64'),
        mimeType: mimeType
      }
    };

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    return response.text();
    
  } catch (error) {
    console.error("Gemini Vision API hatası:", error);
    throw new Error(`Resim soru-cevap başarısız: ${error.message}`);
  }
}

module.exports = {
  summarize,
  askQuestion,
  analyzeImage,
  askImageQuestion
};
