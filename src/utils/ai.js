const { GoogleGenerativeAI } = require("@google/generative-ai");

// Gemini API anahtarını .env dosyasından al
const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.warn("⚠️ GEMINI_API_KEY bulunamadı! .env dosyasına ekleyin.");
}

const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;
const MAX_TEXT_CONTEXT_CHARS = 100000;
const MAX_EXCEL_CONTEXT_CHARS = 500000;

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
      ? `Aşağıdaki Excel dosyasını hızlıca gözden geçir ve sadece tek cümlelik, maksimum 25 kelimelik bir Türkçe özet üret.
Excel dosyasının sayfa sayısı, kategorisi ve içerik türünü mümkün olduğunca kısaca belirt.
Çok detay verme, kısa tut.

EXCEL ÖZETİ İÇİN METİN:
${text}`
      : `Aşağıdaki belgeyi hızlıca analiz et ve en fazla 25 kelimelik, tek cümlelik bir Türkçe betimleme yaz.
Belgenin genel temasını ve önemli detayını kısaca belirt.

BELGE ÖZETİ İÇİN METİN:
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
 * Resim için hızlı betimleme (20-25 kelime)
 */
async function quickDescribeImage(base64Data, mimeType) {
  if (!genAI) {
    throw new Error("Gemini API anahtarı tanımlanmamış. .env dosyasını kontrol edin.");
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `Bu resmi hızlıca analiz et ve sadece 20-25 kelimelik bir Türkçe betimleme yaz.
Betimleme tek cümle olsun ve ana unsurlardan bahsetsin. Çok detay verme.`;

    const result = await model.generateContent([
      {
        inlineData: {
          data: base64Data,
          mimeType,
        },
      },
      prompt,
    ]);

    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini hızlı resim betimleme hatası:", error);
    throw new Error(`Hızlı resim betimleme başarısız: ${error.message}`);
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
    const isExcel = text.includes("=== SAYFA") || text.includes("=== EŞLEŞME SONUÇLARI ===");
    const isFocusedExcelContext = text.includes("=== EŞLEŞME SONUÇLARI ===");
    const contextLimit = isExcel ? MAX_EXCEL_CONTEXT_CHARS : MAX_TEXT_CONTEXT_CHARS;
    const truncatedText = text.slice(0, contextLimit);
    
    const prompt = isExcel
      ? isFocusedExcelContext
        ? `Sen bir Excel veri analiz uzmanısın. Uygulama tarafı eşleşen satırları JS ile önceden buldu.
Sana sadece eşleşen satır ve yakın bağlam gönderiliyor. Sadece bu bağlamdaki verilere dayanarak cevap ver.

KURALLAR:
- Cevabı kısa ve net ver.
- Satırdaki alan adlarını doğru kullan.
- Bilgi bağlamda yoksa "Bu bilgi bulunan satır bağlamında görünmüyor" de.
- Tahmin yapma.

SORU: ${question}

EŞLEŞEN SATIR VE YAKIN BAĞLAM:
${truncatedText}`
        : `Sen bir Excel veri analiz uzmanısın. Aşağıdaki Excel dosyasının TÜM SAYFALARINI detaylı şekilde tarayarak soruyu cevapla.

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
${truncatedText}`
      : `Aşağıdaki belgenin TAMAMINI analiz ederek soruyu Türkçe olarak cevapla.
Belgede geçen bilgilere göre detaylı cevap ver. Eğer belgede yoksa "Bu bilgi belgede bulunmuyor" de.

SORU: ${question}

BELGE TAMAMI:
${truncatedText}`;

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
  askImageQuestion,
  quickDescribeImage
};
