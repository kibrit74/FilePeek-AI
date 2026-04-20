const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  createAISettingsStore,
} = require("../src/utils/ai-settings-store");

function createTempFilePath() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "filepeek-ai-store-"));
  return path.join(tempDir, "ai-settings.json");
}

function createFakeSafeStorage() {
  return {
    isEncryptionAvailable() {
      return true;
    },
    encryptString(value) {
      return Buffer.from(`enc:${value}`, "utf8");
    },
    decryptString(buffer) {
      return String(buffer).replace(/^enc:/, "");
    },
  };
}

test("createAISettingsStore persists encrypted secrets and exposes masked public settings", () => {
  const filePath = createTempFilePath();
  const store = createAISettingsStore({
    filePath,
    safeStorage: createFakeSafeStorage(),
  });

  store.updateSettings({
    activeProvider: "openai",
    providers: {
      openai: {
        apiKey: "sk-test-secret",
        model: "gpt-5.2",
        visionModel: "gpt-5.2",
      },
    },
  });

  const persisted = fs.readFileSync(filePath, "utf8");
  assert.doesNotMatch(persisted, /sk-test-secret/);

  const publicSettings = store.getPublicSettings();
  assert.equal(publicSettings.activeProvider, "openai");
  assert.equal(publicSettings.providers.openai.model, "gpt-5.2");
  assert.equal(publicSettings.providers.openai.apiKeySet, true);
  assert.match(publicSettings.providers.openai.apiKeyMasked, /\*\*\*\*/);
  assert.equal(store.getProviderSecret("openai"), "sk-test-secret");
});

test("createAISettingsStore clears stored secrets without removing non-secret settings", () => {
  const filePath = createTempFilePath();
  const store = createAISettingsStore({
    filePath,
    safeStorage: createFakeSafeStorage(),
  });

  store.updateSettings({
    activeProvider: "anthropic",
    providers: {
      anthropic: {
        apiKey: "sk-ant-secret",
        model: "claude-sonnet-4-20250514",
      },
    },
  });

  store.updateSettings({
    providers: {
      anthropic: {
        clearApiKey: true,
        model: "claude-opus-4-1-20250805",
      },
    },
  });

  const publicSettings = store.getPublicSettings();
  assert.equal(publicSettings.providers.anthropic.apiKeySet, false);
  assert.equal(publicSettings.providers.anthropic.model, "claude-opus-4-1-20250805");
  assert.equal(store.getProviderSecret("anthropic"), "");
});

test("createAISettingsStore keeps default base URL when only an API key is saved", () => {
  const filePath = createTempFilePath();
  const store = createAISettingsStore({
    filePath,
    safeStorage: createFakeSafeStorage(),
  });

  const settings = store.updateSettings({
    activeProvider: "openrouter",
    providers: {
      openrouter: {
        apiKey: "sk-or-secret",
        model: "openai/gpt-5.2",
      },
    },
  });

  assert.equal(settings.providers.openrouter.baseUrl, "https://openrouter.ai/api/v1");
  assert.equal(settings.providers.openrouter.apiKeySet, true);
  assert.equal(store.getProviderSecret("openrouter"), "sk-or-secret");
});
