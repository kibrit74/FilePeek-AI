# Multi-Provider AI Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add secure user-configured AI providers in the settings modal for OpenAI, Anthropic, OpenRouter, and Ollama, then route existing AI actions through the selected provider.

**Architecture:** Keep secrets in the Electron main process using `safeStorage`, expose only masked settings to the renderer, and move all AI execution behind a provider-agnostic service. The renderer remains responsible for settings UI, while `main` owns secure persistence, model discovery, connection tests, and provider execution.

**Tech Stack:** Electron main/preload IPC, Node.js, `axios`, renderer DOM UI, `safeStorage`, Node test runner

---

### Task 1: Secure Provider Settings Store

**Files:**
- Create: `src/utils/ai-settings-store.js`
- Test: `test/ai-settings-store.test.js`

- [ ] Add store tests for encrypted persistence, masked key exposure, and key clearing
- [ ] Run the new store tests and verify they fail for missing module behavior
- [ ] Implement the secure store with `safeStorage` injection support for tests
- [ ] Re-run the store tests and verify they pass

### Task 2: Provider Service and Model Discovery

**Files:**
- Create: `src/utils/ai-service.js`
- Modify: `src/main.js`
- Modify: `src/preload.js`
- Test: `test/ai-service.test.js`

- [ ] Add provider service tests for default provider normalization and prompt output extraction helpers
- [ ] Run the targeted service tests and verify they fail
- [ ] Implement provider metadata, model discovery, connection tests, and text/vision generation adapters
- [ ] Wire `main` IPC handlers for settings get/save, model refresh, provider test, Ollama pull, and existing AI actions
- [ ] Re-run the targeted tests and verify they pass

### Task 3: Settings Modal UI and Renderer Integration

**Files:**
- Modify: `src/renderer/index.html`
- Modify: `src/renderer/app.js`
- Modify: `src/renderer/styles.css`

- [ ] Add AI provider controls to the settings modal
- [ ] Load masked provider settings into the modal and allow save/test/refresh flows
- [ ] Add Ollama model pull UI and active provider selection
- [ ] Keep existing AI buttons working by reusing the existing renderer entry points

### Task 4: Full Verification

**Files:**
- Modify: `package.json` (only if dependency changes become necessary)

- [ ] Run targeted test files
- [ ] Run the full test suite
- [ ] Run syntax checks for `src/main.js`, `src/preload.js`, and `src/renderer/app.js`
- [ ] Start the Electron app and sanity check the settings modal and AI action plumbing
