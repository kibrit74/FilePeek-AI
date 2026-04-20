const axios = require("axios");
const {
  PROVIDER_DEFINITIONS,
} = require("./ai-settings-store");

const MAX_TEXT_CONTEXT_CHARS = 100000;
const MAX_EXCEL_CONTEXT_CHARS = 500000;

const PROVIDER_ERROR_NAMES = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  openrouter: "OpenRouter",
  gemini: "Gemini",
  ollama: "Ollama",
};

function trimTrailingSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}

function joinUrl(baseUrl, segment) {
  return `${trimTrailingSlash(baseUrl)}/${String(segment || "").replace(/^\/+/, "")}`;
}

function getGeminiNativeBaseUrl(baseUrl) {
  return trimTrailingSlash(baseUrl).replace(/\/openai$/i, "");
}

function isExcelLikeText(text) {
  return text.includes("=== SAYFA") || text.includes("=== EŞLEŞME SONUÇLARI ===");
}

function extractTextFromProviderResponse(providerId, payload) {
  if (!payload) return "";

  if (providerId === "openai") {
    if (typeof payload.output_text === "string" && payload.output_text.trim()) {
      return payload.output_text.trim();
    }

    return (payload.output || [])
      .flatMap(item => item.content || [])
      .filter(item => item.type === "output_text")
      .map(item => item.text)
      .join("\n")
      .trim();
  }

  if (providerId === "anthropic") {
    return (payload.content || [])
      .filter(item => item.type === "text")
      .map(item => item.text)
      .join("\n")
      .trim();
  }

  if (providerId === "openrouter") {
    const messageContent = payload.choices?.[0]?.message?.content;
    if (typeof messageContent === "string") {
      return messageContent.trim();
    }
    if (Array.isArray(messageContent)) {
      return messageContent
        .filter(item => item.type === "text")
        .map(item => item.text)
        .join("\n")
        .trim();
    }
    return "";
  }

  if (providerId === "ollama") {
    return String(payload.message?.content || payload.response || "").trim();
  }

  return "";
}

function extractGeminiTextResponse(payload) {
  return (payload?.candidates || [])
    .flatMap(candidate => candidate.content?.parts || [])
    .map(part => part.text || "")
    .join("\n")
    .trim();
}

function normalizeDiscoveredModels(providerId, payload) {
  if (providerId === "openrouter") {
    return (payload.data || []).map(model => ({
      id: model.id,
      label: model.name || model.id,
      supportsVision: Boolean(model.architecture?.input_modalities?.includes("image")),
    }));
  }

  if (providerId === "openai") {
    return (payload.data || [])
      .filter(model => !String(model.id || "").startsWith("ft:"))
      .filter(model => /^(gpt|o[134]|chatgpt)/i.test(String(model.id || "")))
      .filter(model => !/(audio|transcribe|tts|image|realtime|embedding|moderation)/i.test(String(model.id || "")))
      .map(model => ({
        id: model.id,
        label: model.id,
        supportsVision: /^(gpt|o[34])/i.test(model.id),
      }));
  }

  if (providerId === "anthropic") {
    return (payload.data || []).map(model => ({
      id: model.id,
      label: model.display_name || model.id,
      supportsVision: true,
    }));
  }

  if (providerId === "gemini") {
    return (payload.data || [])
      .filter(model => /^gemini/i.test(String(model.id || "")))
      .map(model => ({
        id: model.id,
        label: model.id,
        supportsVision: true,
      }));
  }

  if (providerId === "ollama") {
    return (payload.models || []).map(model => ({
      id: model.model || model.name,
      label: model.name || model.model,
      supportsVision: /(gemma4|gemma3|llava|vision|bakllava|moondream|minicpm|qwen.*vl)/i.test(model.name || model.model || ""),
    }));
  }

  return [];
}

function formatProviderRequestError(providerId, error) {
  const providerName = PROVIDER_ERROR_NAMES[providerId] || "AI sağlayıcısı";
  const status = error?.response?.status || error?.response?.data?.error?.code;
  const providerMessage =
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    "Bilinmeyen hata";

  const message = status
    ? `${providerName} hatası ${status}: ${providerMessage}`
    : `${providerName} hatası: ${providerMessage}`;

  const nextError = new Error(message);
  nextError.status = status;
  nextError.providerId = providerId;
  nextError.responseData = error?.response?.data;
  return nextError;
}

async function withProviderErrorDetails(providerId, operation) {
  try {
    return await operation();
  } catch (error) {
    throw formatProviderRequestError(providerId, error);
  }
}

function createSummaryPrompt(text) {
  const isExcel = isExcelLikeText(text);
  return isExcel
    ? `Aşağıdaki Excel dosyasını hızlıca gözden geçir ve sadece tek cümlelik, maksimum 25 kelimelik bir Türkçe özet üret.
Excel dosyasının sayfa sayısı, kategorisi ve içerik türünü mümkün olduğunca kısaca belirt.
Çok detay verme, kısa tut.

EXCEL ÖZETİ İÇİN METİN:
${text}`
    : `Aşağıdaki belgeyi hızlıca analiz et ve en fazla 25 kelimelik, tek cümlelik bir Türkçe betimleme yaz.
Belgenin genel temasını ve önemli detayını kısaca belirt.

BELGE ÖZETİ İÇİN METİN:
${text}`;
}

function createQuestionPrompt(text, question) {
  const isExcel = isExcelLikeText(text);
  const isFocusedExcelContext = text.includes("=== EŞLEŞME SONUÇLARI ===");
  const contextLimit = isExcel ? MAX_EXCEL_CONTEXT_CHARS : MAX_TEXT_CONTEXT_CHARS;
  const truncatedText = text.slice(0, contextLimit);

  if (isExcel && isFocusedExcelContext) {
    return `Sen bir Excel veri analiz uzmanısın. Uygulama tarafı eşleşen satırları JS ile önceden buldu.
Sana sadece eşleşen satır ve yakın bağlam gönderiliyor. Sadece bu bağlamdaki verilere dayanarak cevap ver.

KURALLAR:
- Cevabı kısa ve net ver.
- Satırdaki alan adlarını doğru kullan.
- Bilgi bağlamda yoksa "Bu bilgi bulunan satır bağlamında görünmüyor" de.
- Tahmin yapma.

SORU: ${question}

EŞLEŞEN SATIR VE YAKIN BAĞLAM:
${truncatedText}`;
  }

  if (isExcel) {
    return `Sen bir Excel veri analiz uzmanısın. Aşağıdaki Excel dosyasının TÜM SAYFALARINI detaylı şekilde tarayarak soruyu cevapla.

KURALLAR:
- Cevabı Türkçe ver.
- Eşleşme varsa sayfa, satır, sütun ve ilgili bağlamı belirt.
- Birden fazla eşleşme varsa hepsini listele.
- Bilgi yoksa açıkça "Bu bilgi bulunamadı" de.

SORU: ${question}

EXCEL DOSYASI:
${truncatedText}`;
  }

  return `Aşağıdaki belgenin TAMAMINI analiz ederek soruyu Türkçe olarak cevapla.
Belgede geçen bilgilere göre detaylı cevap ver. Eğer belgede yoksa "Bu bilgi belgede bulunmuyor" de.

SORU: ${question}

BELGE TAMAMI:
${truncatedText}`;
}

function createImageAnalysisPrompt() {
  return `Bu resmi Türkçe olarak detaylıca betimle ve analiz et. Şunları yap:

1. Genel Bakış: Resimde ne görünüyor? (ana konu, ortam, renkler)
2. Detaylar: Önemli öğeler, nesneler, insanlar (varsa)
3. Bağlam: Resmin türü (fotoğraf, grafik, ekran görüntüsü, tablo, diyagram vb.)
4. Metin: Resimde yazı varsa oku ve belirt
5. Öneriler: Bu resim ne amaçla kullanılabilir?

Açıklaman net, detaylı ve Türkçe olsun.`;
}

function createQuickImagePrompt() {
  return `Bu resmi hızlıca analiz et ve sadece 20-25 kelimelik bir Türkçe betimleme yaz.
Betimleme tek cümle olsun ve ana unsurlardan bahsetsin. Çok detay verme.`;
}

function createImageQuestionPrompt(question) {
  return `Bu resme bakarak şu soruyu Türkçe olarak cevapla: ${question}

Eğer cevap resimde yoksa "Bu bilgi resimde görünmüyor" de.`;
}

function createAudioTranscriptionPrompt() {
  return `Bu ses kaydındaki konuşmayı Türkçe olarak yazıya çevir.
Sadece konuşulan metni döndür.
Yorum, açıklama, başlık veya tırnak işareti ekleme.
Ses anlaşılmıyorsa sadece "Ses anlaşılamadı" yaz.`;
}

function createVisionUserContent(prompt, imageBase64, mimeType, schema) {
  if (schema === "responses") {
    return [
      { type: "input_text", text: prompt },
      { type: "input_image", image_url: `data:${mimeType};base64,${imageBase64}` },
    ];
  }

  if (schema === "anthropic") {
    return [
      { type: "text", text: prompt },
      {
        type: "image",
        source: {
          type: "base64",
          media_type: mimeType,
          data: imageBase64,
        },
      },
    ];
  }

  if (schema === "chat") {
    return [
      { type: "text", text: prompt },
      { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
    ];
  }

  return prompt;
}

function createAIService({ settingsStore, axiosInstance = axios }) {
  function getProviderConfig(providerId, overrides = {}) {
    const state = settingsStore.getState();
    const resolvedProviderId = PROVIDER_DEFINITIONS[providerId] ? providerId : state.activeProvider;
    const defaults = PROVIDER_DEFINITIONS[resolvedProviderId];
    const stored = state.providers[resolvedProviderId] || {};
    const merged = {
      providerId: resolvedProviderId,
      baseUrl: String(overrides.baseUrl || stored.baseUrl || defaults.defaultBaseUrl).trim(),
      model: String(overrides.model || stored.model || defaults.defaultModel).trim(),
      visionModel: String(overrides.visionModel || stored.visionModel || defaults.defaultVisionModel).trim(),
      apiKey: typeof overrides.apiKey === "string" ? overrides.apiKey.trim() : (stored.apiKey || ""),
    };

    return merged;
  }

  function assertConfigured(provider) {
    if (provider.providerId !== "ollama" && !provider.apiKey) {
      throw new Error(`${PROVIDER_DEFINITIONS[provider.providerId].name} API anahtarı ayarlanmamış.`);
    }
  }

  async function requestOpenAI(provider, prompt, { model, imageBase64, mimeType } = {}) {
    assertConfigured(provider);
    const response = await withProviderErrorDetails("openai", () => axiosInstance.post(
      joinUrl(provider.baseUrl, "responses"),
      {
        model: model || provider.model,
        input: [
          {
            role: "user",
            content: imageBase64
              ? createVisionUserContent(prompt, imageBase64, mimeType, "responses")
              : [{ type: "input_text", text: prompt }],
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${provider.apiKey}`,
          "Content-Type": "application/json",
        },
      }
    ));

    return extractTextFromProviderResponse("openai", response.data);
  }

  async function requestAnthropic(provider, prompt, { model, imageBase64, mimeType } = {}) {
    assertConfigured(provider);
    const response = await withProviderErrorDetails("anthropic", () => axiosInstance.post(
      joinUrl(provider.baseUrl, "messages"),
      {
        model: model || provider.model,
        max_tokens: 2048,
        messages: [
          {
            role: "user",
            content: imageBase64
              ? createVisionUserContent(prompt, imageBase64, mimeType, "anthropic")
              : [{ type: "text", text: prompt }],
          },
        ],
      },
      {
        headers: {
          "x-api-key": provider.apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
      }
    ));

    return extractTextFromProviderResponse("anthropic", response.data);
  }

  async function requestOpenRouter(provider, prompt, { model, imageBase64, mimeType } = {}) {
    assertConfigured(provider);
    const response = await withProviderErrorDetails("openrouter", () => axiosInstance.post(
      joinUrl(provider.baseUrl, "chat/completions"),
      {
        model: model || provider.model,
        provider: {
          allow_fallbacks: true,
        },
        messages: [
          {
            role: "user",
            content: imageBase64
              ? createVisionUserContent(prompt, imageBase64, mimeType, "chat")
              : prompt,
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${provider.apiKey}`,
          "Content-Type": "application/json",
        },
      }
    ));

    return extractTextFromProviderResponse("openrouter", response.data);
  }

  async function requestGemini(provider, prompt, { model, imageBase64, mimeType } = {}) {
    assertConfigured(provider);
    const response = await withProviderErrorDetails("gemini", () => axiosInstance.post(
      joinUrl(provider.baseUrl, "chat/completions"),
      {
        model: model || provider.model,
        messages: [
          {
            role: "user",
            content: imageBase64
              ? createVisionUserContent(prompt, imageBase64, mimeType, "chat")
              : prompt,
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${provider.apiKey}`,
          "Content-Type": "application/json",
        },
      }
    ));

    return extractTextFromProviderResponse("openrouter", response.data);
  }

  async function requestGeminiAudioTranscription(provider, audioBase64, mimeType) {
    assertConfigured(provider);
    const response = await withProviderErrorDetails("gemini", () => axiosInstance.post(
      joinUrl(getGeminiNativeBaseUrl(provider.baseUrl), `models/${provider.model}:generateContent`),
      {
        contents: [
          {
            role: "user",
            parts: [
              { text: createAudioTranscriptionPrompt() },
              {
                inlineData: {
                  mimeType,
                  data: audioBase64,
                },
              },
            ],
          },
        ],
      },
      {
        headers: {
          "x-goog-api-key": provider.apiKey,
          "Content-Type": "application/json",
        },
      }
    ));

    return extractGeminiTextResponse(response.data);
  }

  async function requestOllama(provider, prompt, { model, imageBase64 } = {}) {
    const response = await withProviderErrorDetails("ollama", () => axiosInstance.post(
      joinUrl(provider.baseUrl, "api/chat"),
      {
        model: model || provider.model,
        stream: false,
        messages: [
          {
            role: "user",
            content: prompt,
            ...(imageBase64 ? { images: [imageBase64] } : {}),
          },
        ],
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    ));

    return extractTextFromProviderResponse("ollama", response.data);
  }

  async function generate(providerId, prompt, options = {}) {
    const provider = getProviderConfig(providerId, options.providerOverrides);
    const requestOptions = {
      model: options.model || provider.model,
      imageBase64: options.imageBase64,
      mimeType: options.mimeType,
    };

    if (provider.providerId === "openai") {
      return requestOpenAI(provider, prompt, requestOptions);
    }
    if (provider.providerId === "anthropic") {
      return requestAnthropic(provider, prompt, requestOptions);
    }
    if (provider.providerId === "openrouter") {
      return requestOpenRouter(provider, prompt, requestOptions);
    }
    if (provider.providerId === "gemini") {
      return requestGemini(provider, prompt, requestOptions);
    }
    if (provider.providerId === "ollama") {
      return requestOllama(provider, prompt, requestOptions);
    }

    throw new Error("Desteklenmeyen AI sağlayıcısı.");
  }

  return {
    async summarize(text) {
      return generate(undefined, createSummaryPrompt(text));
    },

    async askQuestion(text, question) {
      return generate(undefined, createQuestionPrompt(text, question));
    },

    async analyzeImage(imageBuffer, mimeType) {
      return generate(undefined, createImageAnalysisPrompt(), {
        model: getProviderConfig().visionModel,
        imageBase64: imageBuffer.toString("base64"),
        mimeType,
      });
    },

    async quickDescribeImage(base64Data, mimeType) {
      return generate(undefined, createQuickImagePrompt(), {
        model: getProviderConfig().visionModel,
        imageBase64: base64Data,
        mimeType,
      });
    },

    async askImageQuestion(imageBuffer, mimeType, question) {
      return generate(undefined, createImageQuestionPrompt(question), {
        model: getProviderConfig().visionModel,
        imageBase64: imageBuffer.toString("base64"),
        mimeType,
      });
    },

    async transcribeAudio(audioBuffer, mimeType) {
      if (!audioBuffer?.length) {
        throw new Error("Ses verisi bos.");
      }

      const provider = getProviderConfig("gemini");
      const transcript = await requestGeminiAudioTranscription(
        provider,
        audioBuffer.toString("base64"),
        String(mimeType || "audio/webm").split(";")[0]
      );

      if (!transcript || /ses anlaşılamadı|ses anlasilamadi/i.test(transcript)) {
        throw new Error("Ses anlaşılamadı. Mikrofona daha yakın konuşup tekrar deneyin.");
      }

      return transcript;
    },

    getPublicSettings() {
      return settingsStore.getPublicSettings();
    },

    updateSettings(input) {
      return settingsStore.updateSettings(input);
    },

    async listModels(providerId, overrides = {}) {
      const provider = getProviderConfig(providerId, overrides);

      if (provider.providerId === "openai") {
        assertConfigured(provider);
        const response = await withProviderErrorDetails("openai", () => axiosInstance.get(joinUrl(provider.baseUrl, "models"), {
          headers: { Authorization: `Bearer ${provider.apiKey}` },
        }));
        return normalizeDiscoveredModels("openai", response.data);
      }

      if (provider.providerId === "anthropic") {
        assertConfigured(provider);
        const response = await withProviderErrorDetails("anthropic", () => axiosInstance.get(joinUrl(provider.baseUrl, "models"), {
          headers: {
            "x-api-key": provider.apiKey,
            "anthropic-version": "2023-06-01",
          },
        }));
        return normalizeDiscoveredModels("anthropic", response.data);
      }

      if (provider.providerId === "openrouter") {
        assertConfigured(provider);
        const response = await withProviderErrorDetails("openrouter", () => axiosInstance.get(joinUrl(provider.baseUrl, "models"), {
          headers: { Authorization: `Bearer ${provider.apiKey}` },
        }));
        return normalizeDiscoveredModels("openrouter", response.data);
      }

      if (provider.providerId === "gemini") {
        assertConfigured(provider);
        const response = await withProviderErrorDetails("gemini", () => axiosInstance.get(joinUrl(provider.baseUrl, "models"), {
          headers: { Authorization: `Bearer ${provider.apiKey}` },
        }));
        return normalizeDiscoveredModels("gemini", response.data);
      }

      if (provider.providerId === "ollama") {
        const response = await withProviderErrorDetails("ollama", () => axiosInstance.get(joinUrl(provider.baseUrl, "api/tags")));
        return normalizeDiscoveredModels("ollama", response.data);
      }

      return [];
    },

    async testProviderConnection(providerId, overrides = {}) {
      const models = await this.listModels(providerId, overrides);
      return {
        ok: true,
        modelCount: models.length,
      };
    },

    async pullOllamaModel({ modelName, baseUrl }) {
      if (!modelName || !String(modelName).trim()) {
        throw new Error("İndirilecek model adı boş olamaz.");
      }

      const response = await withProviderErrorDetails("ollama", () => axiosInstance.post(joinUrl(baseUrl || PROVIDER_DEFINITIONS.ollama.defaultBaseUrl, "api/pull"), {
        model: String(modelName).trim(),
        stream: false,
      }));

      return response.data;
    },
  };
}

module.exports = {
  createAIService,
  extractGeminiTextResponse,
  extractTextFromProviderResponse,
  formatProviderRequestError,
  normalizeDiscoveredModels,
};
