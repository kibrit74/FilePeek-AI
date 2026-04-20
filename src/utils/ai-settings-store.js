const fs = require("node:fs");

const PROVIDER_DEFINITIONS = Object.freeze({
  openai: {
    id: "openai",
    name: "OpenAI",
    defaultBaseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-5.2",
    defaultVisionModel: "gpt-5.2",
  },
  anthropic: {
    id: "anthropic",
    name: "Anthropic",
    defaultBaseUrl: "https://api.anthropic.com/v1",
    defaultModel: "claude-sonnet-4-20250514",
    defaultVisionModel: "claude-sonnet-4-20250514",
  },
  openrouter: {
    id: "openrouter",
    name: "OpenRouter",
    defaultBaseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "openrouter/auto",
    defaultVisionModel: "openrouter/auto",
  },
  gemini: {
    id: "gemini",
    name: "Gemini",
    defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    defaultModel: "gemini-2.5-flash",
    defaultVisionModel: "gemini-2.5-flash",
  },
  ollama: {
    id: "ollama",
    name: "Ollama",
    defaultBaseUrl: "http://localhost:11434",
    defaultModel: "gemma4",
    defaultVisionModel: "gemma4",
  },
});

function getProviderIds() {
  return Object.keys(PROVIDER_DEFINITIONS);
}

function getDefaultProviderConfig(providerId) {
  const definition = PROVIDER_DEFINITIONS[providerId];
  return {
    baseUrl: definition.defaultBaseUrl,
    model: definition.defaultModel,
    visionModel: definition.defaultVisionModel,
    apiKey: "",
  };
}

function createDefaultAISettings() {
  const providers = {};

  for (const providerId of getProviderIds()) {
    providers[providerId] = getDefaultProviderConfig(providerId);
  }

  return {
    version: 1,
    activeProvider: "openai",
    providers,
  };
}

function normalizeProviderId(providerId) {
  return PROVIDER_DEFINITIONS[providerId] ? providerId : "openai";
}

function maskSecret(secret) {
  if (!secret) return "";
  const suffix = String(secret).slice(-4);
  return `****${suffix}`;
}

function encryptSecret(secret, safeStorage) {
  if (!secret) {
    return { mode: "empty", value: "" };
  }

  if (safeStorage?.isEncryptionAvailable?.()) {
    return {
      mode: "safeStorage",
      value: safeStorage.encryptString(secret).toString("base64"),
    };
  }

  return { mode: "plain", value: String(secret) };
}

function decryptSecret(payload, safeStorage) {
  if (!payload || payload.mode === "empty" || !payload.value) {
    return "";
  }

  if (payload.mode === "safeStorage") {
    if (!safeStorage?.decryptString) {
      return "";
    }
    return safeStorage.decryptString(Buffer.from(payload.value, "base64"));
  }

  return String(payload.value || "");
}

function normalizeState(input = {}, previousState = createDefaultAISettings()) {
  const baseState = previousState || createDefaultAISettings();
  const nextState = {
    version: 1,
    activeProvider: normalizeProviderId(input.activeProvider || baseState.activeProvider),
    providers: {},
  };

  for (const providerId of getProviderIds()) {
    const defaults = getDefaultProviderConfig(providerId);
    const previousProvider = baseState.providers?.[providerId] || defaults;
    const incomingProvider = input.providers?.[providerId] || {};

    let apiKey = previousProvider.apiKey || "";
    if (incomingProvider.clearApiKey) {
      apiKey = "";
    } else if (typeof incomingProvider.apiKey === "string") {
      apiKey = incomingProvider.apiKey.trim();
    }

    nextState.providers[providerId] = {
      baseUrl: String(incomingProvider.baseUrl || previousProvider.baseUrl || defaults.baseUrl).trim(),
      model: String(incomingProvider.model || previousProvider.model || defaults.model).trim(),
      visionModel: String(
        incomingProvider.visionModel || previousProvider.visionModel || defaults.visionModel
      ).trim(),
      apiKey,
    };
  }

  return nextState;
}

function serializeState(state, safeStorage) {
  const payload = {
    version: 1,
    activeProvider: state.activeProvider,
    providers: {},
  };

  for (const providerId of getProviderIds()) {
    const provider = state.providers[providerId];
    payload.providers[providerId] = {
      baseUrl: provider.baseUrl,
      model: provider.model,
      visionModel: provider.visionModel,
      apiKey: encryptSecret(provider.apiKey, safeStorage),
    };
  }

  return JSON.stringify(payload, null, 2);
}

function deserializeState(raw, safeStorage) {
  const parsed = JSON.parse(raw);
  const initialState = createDefaultAISettings();
  const nextState = {
    version: 1,
    activeProvider: normalizeProviderId(parsed.activeProvider || initialState.activeProvider),
    providers: {},
  };

  for (const providerId of getProviderIds()) {
    const defaults = getDefaultProviderConfig(providerId);
    const provider = parsed.providers?.[providerId] || {};
    nextState.providers[providerId] = {
      baseUrl: String(provider.baseUrl || defaults.baseUrl).trim(),
      model: String(provider.model || defaults.model).trim(),
      visionModel: String(provider.visionModel || defaults.visionModel).trim(),
      apiKey: decryptSecret(provider.apiKey, safeStorage),
    };
  }

  return nextState;
}

function toPublicSettings(state) {
  const payload = {
    version: 1,
    activeProvider: state.activeProvider,
    providers: {},
  };

  for (const providerId of getProviderIds()) {
    const provider = state.providers[providerId];
    payload.providers[providerId] = {
      baseUrl: provider.baseUrl,
      model: provider.model,
      visionModel: provider.visionModel,
      apiKeySet: Boolean(provider.apiKey),
      apiKeyMasked: maskSecret(provider.apiKey),
    };
  }

  return payload;
}

function createAISettingsStore({
  filePath,
  safeStorage,
  fsImpl = fs,
}) {
  let state = null;

  function ensureLoaded() {
    if (state) {
      return state;
    }

    if (!filePath || !fsImpl.existsSync(filePath)) {
      state = createDefaultAISettings();
      return state;
    }

    try {
      const raw = fsImpl.readFileSync(filePath, "utf8");
      state = deserializeState(raw, safeStorage);
    } catch (error) {
      state = createDefaultAISettings();
    }

    return state;
  }

  function persist() {
    const currentState = ensureLoaded();
    fsImpl.mkdirSync(require("node:path").dirname(filePath), { recursive: true });
    fsImpl.writeFileSync(filePath, serializeState(currentState, safeStorage), "utf8");
  }

  return {
    getState() {
      return ensureLoaded();
    },

    getPublicSettings() {
      return toPublicSettings(ensureLoaded());
    },

    getProviderSecret(providerId) {
      const resolvedId = normalizeProviderId(providerId);
      return ensureLoaded().providers[resolvedId].apiKey || "";
    },

    updateSettings(input = {}) {
      state = normalizeState(input, ensureLoaded());
      persist();
      return this.getPublicSettings();
    },
  };
}

module.exports = {
  PROVIDER_DEFINITIONS,
  createAISettingsStore,
  createDefaultAISettings,
  normalizeState,
  maskSecret,
};
