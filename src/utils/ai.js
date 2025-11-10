const { GoogleGenerativeAI } = require("@google/generative-ai");

// Gemini API anahtarını .env dosyasından al
const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.warn("⚠️ GEMINI_API_KEY bulunamadı! .env dosyasına ekleyin.");
}

const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

/**
 * Dosya içeriğini özetler
 * @param {string} text - Özetlenecek metin
 * @returns {Promise<string>} - Özet metni
 */
async function summarize(text) {
  if (!genAI) {
    throw new Error("Gemini API anahtarı tanımlanmamış. .env dosyasını kontrol edin.");
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    const prompt = `Aşağıdaki belgeyi Türkçe olarak 5-7 madde halinde özetle. 
Her madde kısa ve net olsun. Sadece önemli bilgileri içersin.

BELGE İÇERİĞİ:
${text.slice(0, 15000)}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
    
  } catch (error) {
    console.error("Gemini API hatası:", error);
    throw new Error(`AI özetleme başarısız: ${error.message}`);
  }
}

/**
 * Belge içeriği hakkında soru sorar ve cevap alır
 * @param {string} text - Belge içeriği
 * @param {string} question - Sorulacak soru
 * @returns {Promise<string>} - Cevap metni
 */
async function askQuestion(text, question) {
  if (!genAI) {
    throw new Error("Gemini API anahtarı tanımlanmamış. .env dosyasını kontrol edin.");
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    const prompt = `Aşağıdaki belgeye dayanarak soruyu Türkçe olarak cevapla.
Sadece belgede geçen bilgilere göre cevap ver. Eğer belgede yoksa "Bu bilgi belgede bulunmuyor" de.

SORU: ${question}

BELGE İÇERİĞİ:
${text.slice(0, 15000)}`;

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
