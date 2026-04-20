const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createAIService,
  extractGeminiTextResponse,
  extractTextFromProviderResponse,
  formatProviderRequestError,
  normalizeDiscoveredModels,
} = require("../src/utils/ai-service");

test("extractTextFromProviderResponse reads OpenAI Responses API output_text", () => {
  const text = extractTextFromProviderResponse("openai", {
    output_text: "Merhaba dunya",
  });

  assert.equal(text, "Merhaba dunya");
});

test("extractTextFromProviderResponse flattens Anthropic content blocks", () => {
  const text = extractTextFromProviderResponse("anthropic", {
    content: [
      { type: "text", text: "Ilk satir" },
      { type: "tool_use", name: "ignored" },
      { type: "text", text: "Ikinci satir" },
    ],
  });

  assert.equal(text, "Ilk satir\nIkinci satir");
});

test("normalizeDiscoveredModels returns OpenRouter models with capability flags", () => {
  const models = normalizeDiscoveredModels("openrouter", {
    data: [
      {
        id: "openrouter/auto",
        name: "Auto Router",
        architecture: {
          input_modalities: ["text", "image"],
          output_modalities: ["text"],
        },
      },
    ],
  });

  assert.deepEqual(models, [
    {
      id: "openrouter/auto",
      label: "Auto Router",
      supportsVision: true,
    },
  ]);
});

test("normalizeDiscoveredModels returns Gemini models from OpenAI-compatible listing", () => {
  const models = normalizeDiscoveredModels("gemini", {
    data: [
      { id: "gemini-2.5-flash" },
      { id: "gemini-2.5-pro" },
      { id: "text-embedding-004" },
    ],
  });

  assert.deepEqual(models, [
    {
      id: "gemini-2.5-flash",
      label: "gemini-2.5-flash",
      supportsVision: true,
    },
    {
      id: "gemini-2.5-pro",
      label: "gemini-2.5-pro",
      supportsVision: true,
    },
  ]);
});

test("formatProviderRequestError includes OpenRouter error body for 503 responses", () => {
  const error = formatProviderRequestError("openrouter", {
    response: {
      status: 503,
      data: {
        error: {
          code: 503,
          message: "There is no available model provider that meets your routing requirements",
        },
      },
    },
    message: "Request failed with status code 503",
  });

  assert.equal(
    error.message,
    "OpenRouter hatası 503: There is no available model provider that meets your routing requirements"
  );
});

test("extractGeminiTextResponse flattens Gemini native candidates", () => {
  const text = extractGeminiTextResponse({
    candidates: [
      {
        content: {
          parts: [
            { text: "Ilk parca" },
            { text: "Ikinci parca" },
          ],
        },
      },
    ],
  });

  assert.equal(text, "Ilk parca\nIkinci parca");
});

test("transcribeAudio sends inline audio to Gemini native generateContent", async () => {
  const calls = [];
  const service = createAIService({
    settingsStore: {
      getState() {
        return {
          activeProvider: "openai",
          providers: {
            gemini: {
              baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
              model: "gemini-2.5-flash",
              visionModel: "gemini-2.5-flash",
              apiKey: "test-key",
            },
          },
        };
      },
    },
    axiosInstance: {
      async post(url, body, options) {
        calls.push({ url, body, options });
        return {
          data: {
            candidates: [
              { content: { parts: [{ text: "Dosya ne anlatiyor?" }] } },
            ],
          },
        };
      },
    },
  });

  const transcript = await service.transcribeAudio(Buffer.from("audio"), "audio/webm;codecs=opus");

  assert.equal(transcript, "Dosya ne anlatiyor?");
  assert.equal(calls[0].url, "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent");
  assert.equal(calls[0].options.headers["x-goog-api-key"], "test-key");
  assert.equal(calls[0].body.contents[0].parts[1].inlineData.mimeType, "audio/webm");
  assert.equal(calls[0].body.contents[0].parts[1].inlineData.data, Buffer.from("audio").toString("base64"));
});
