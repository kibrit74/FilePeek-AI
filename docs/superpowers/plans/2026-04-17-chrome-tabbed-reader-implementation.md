# Chrome Tabbed Reader Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the approved Chrome-like tabbed document reader as the default FilePeek AI interface.

**Architecture:** Extract tab behavior into a small CommonJS module that can be tested with Node's built-in test runner. Keep Electron IPC and file parsing unchanged. Update the renderer HTML/CSS to add a browser shell, then adapt `app.js` so active tab state drives preview, AI results, reload, and editor buttons.

**Tech Stack:** Electron, vanilla JavaScript, CSS, Node.js built-in `node:test`, existing `window.kankaAPI` IPC bridge.

---

### Task 1: Testable Tab State Model

**Files:**
- Create: `src/renderer/tab-state.js`
- Create: `test/tab-state.test.js`
- Modify: `package.json`

- [ ] **Step 1: Write failing tests**

Create `test/tab-state.test.js` with tests for adding tabs, focusing an already-open file, close-neighbor behavior, and per-tab data/AI result storage.

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createTabState,
  openLoadingTab,
  setTabReady,
  setTabError,
  closeTab,
  setTabAIResult,
  getActiveTab
} = require("../src/renderer/tab-state");

test("opens a new loading tab for a new file path", () => {
  const state = createTabState();
  const result = openLoadingTab(state, "C:/docs/a.pdf");

  assert.equal(result.reused, false);
  assert.equal(result.state.openTabs.length, 1);
  assert.equal(result.state.activeTabId, result.tab.id);
  assert.equal(result.tab.status, "loading");
  assert.equal(result.tab.filePath, "C:/docs/a.pdf");
  assert.equal(result.tab.name, "a.pdf");
});

test("focuses the existing tab when opening the same file path", () => {
  let state = createTabState();
  state = openLoadingTab(state, "C:/docs/a.pdf").state;
  state = openLoadingTab(state, "C:/docs/b.pdf").state;

  const result = openLoadingTab(state, "C:/docs/a.pdf");

  assert.equal(result.reused, true);
  assert.equal(result.state.openTabs.length, 2);
  assert.equal(getActiveTab(result.state).filePath, "C:/docs/a.pdf");
});

test("stores ready data and active tab AI result independently", () => {
  let state = createTabState();
  const first = openLoadingTab(state, "C:/docs/a.pdf");
  state = setTabReady(first.state, first.tab.id, { name: "a.pdf", type: "pdf", sample: "A" });
  state = setTabAIResult(state, first.tab.id, { title: "Özet", content: "A sonucu" });

  const second = openLoadingTab(state, "C:/docs/b.docx");
  state = setTabReady(second.state, second.tab.id, { name: "b.docx", type: "docx", sample: "B" });

  assert.equal(state.openTabs[0].aiResult.content, "A sonucu");
  assert.equal(state.openTabs[1].aiResult, null);
});

test("keeps tab open with error status when loading fails", () => {
  let state = createTabState();
  const result = openLoadingTab(state, "C:/docs/broken.pdf");
  state = setTabError(result.state, result.tab.id, "Dosya okunamadı");

  assert.equal(state.openTabs.length, 1);
  assert.equal(getActiveTab(state).status, "error");
  assert.equal(getActiveTab(state).error, "Dosya okunamadı");
});

test("closing active tab selects right neighbor, then left neighbor, then empty state", () => {
  let state = createTabState();
  const a = openLoadingTab(state, "C:/docs/a.pdf");
  state = a.state;
  const b = openLoadingTab(state, "C:/docs/b.pdf");
  state = b.state;
  const c = openLoadingTab(state, "C:/docs/c.pdf");
  state = c.state;

  state = closeTab(state, b.tab.id);
  assert.equal(getActiveTab(state).filePath, "C:/docs/c.pdf");

  state = closeTab(state, c.tab.id);
  assert.equal(getActiveTab(state).filePath, "C:/docs/a.pdf");

  state = closeTab(state, a.tab.id);
  assert.equal(state.openTabs.length, 0);
  assert.equal(state.activeTabId, null);
});
```

- [ ] **Step 2: Add test script**

Modify `package.json` scripts:

```json
"test": "node --test test/*.test.js"
```

- [ ] **Step 3: Run tests and verify RED**

Run: `npm test`

Expected: FAIL because `src/renderer/tab-state.js` does not exist.

- [ ] **Step 4: Implement tab state module**

Create `src/renderer/tab-state.js`:

```js
function createTabState() {
  return { openTabs: [], activeTabId: null, nextTabId: 1 };
}

function fileNameFromPath(filePath) {
  return String(filePath || "").split(/[\\/]/).pop() || "Dosya";
}

function cloneState(state) {
  return {
    openTabs: state.openTabs.map(tab => ({ ...tab })),
    activeTabId: state.activeTabId,
    nextTabId: state.nextTabId || 1
  };
}

function getActiveTab(state) {
  return state.openTabs.find(tab => tab.id === state.activeTabId) || null;
}

function openLoadingTab(state, filePath) {
  const nextState = cloneState(state);
  const existing = nextState.openTabs.find(tab => tab.filePath === filePath);
  if (existing) {
    nextState.activeTabId = existing.id;
    return { state: nextState, tab: existing, reused: true };
  }

  const tab = {
    id: `tab-${nextState.nextTabId}`,
    filePath,
    name: fileNameFromPath(filePath),
    type: "",
    size: 0,
    status: "loading",
    data: null,
    aiResult: null,
    error: null
  };

  nextState.nextTabId += 1;
  nextState.openTabs.push(tab);
  nextState.activeTabId = tab.id;
  return { state: nextState, tab, reused: false };
}

function updateTab(state, tabId, patch) {
  const nextState = cloneState(state);
  nextState.openTabs = nextState.openTabs.map(tab => tab.id === tabId ? { ...tab, ...patch } : tab);
  return nextState;
}

function setTabReady(state, tabId, data) {
  return updateTab(state, tabId, {
    name: data.name || state.openTabs.find(tab => tab.id === tabId)?.name || "Dosya",
    type: data.type || "",
    size: data.size || 0,
    status: "ready",
    data,
    error: null
  });
}

function setTabError(state, tabId, error) {
  return updateTab(state, tabId, { status: "error", error: String(error), data: null });
}

function setActiveTab(state, tabId) {
  if (!state.openTabs.some(tab => tab.id === tabId)) return cloneState(state);
  const nextState = cloneState(state);
  nextState.activeTabId = tabId;
  return nextState;
}

function closeTab(state, tabId) {
  const index = state.openTabs.findIndex(tab => tab.id === tabId);
  if (index === -1) return cloneState(state);

  const nextState = cloneState(state);
  const wasActive = nextState.activeTabId === tabId;
  nextState.openTabs.splice(index, 1);

  if (!nextState.openTabs.length) {
    nextState.activeTabId = null;
  } else if (wasActive) {
    const neighbor = nextState.openTabs[index] || nextState.openTabs[index - 1];
    nextState.activeTabId = neighbor.id;
  }

  return nextState;
}

function setTabAIResult(state, tabId, aiResult) {
  return updateTab(state, tabId, { aiResult });
}

module.exports = {
  createTabState,
  openLoadingTab,
  setTabReady,
  setTabError,
  setActiveTab,
  closeTab,
  setTabAIResult,
  getActiveTab
};
```

- [ ] **Step 5: Run tests and verify GREEN**

Run: `npm test`

Expected: PASS.

### Task 2: Browser Shell Markup

**Files:**
- Modify: `src/renderer/index.html`

- [ ] **Step 1: Add browser shell elements**

Add these elements inside `<main class="content">` before `#fileInfo`:

```html
<div class="browser-shell">
  <div class="tab-strip" id="tabStrip">
    <button class="new-tab-button" id="newTabButton" title="Yeni dosya aç">+</button>
  </div>
  <div class="browser-toolbar">
    <button class="toolbar-icon-btn" id="toolbarOpenBtn" title="Dosya Aç">+</button>
    <button class="toolbar-icon-btn" id="toolbarReloadBtn" title="Yenile">↻</button>
    <div class="address-field" id="addressField">Yeni sekme</div>
  </div>
</div>
```

Replace the empty-state block with a Chrome-like new tab view that keeps `.empty-state`, `#dropZone`, and existing copy usable.

- [ ] **Step 2: Smoke-check DOM IDs**

Run: `node --check src/renderer/app.js`

Expected: PASS because JS has not yet referenced new IDs.

### Task 3: Browser Shell Styling

**Files:**
- Modify: `src/renderer/styles.css`

- [ ] **Step 1: Add Chrome-like layout styles**

Add styles for `.browser-shell`, `.tab-strip`, `.document-tab`, `.browser-toolbar`, `.address-field`, `.workspace-layout`, `.tool-rail`, `.document-workspace`, `.new-tab-button`, and responsive behavior. Reuse existing CSS variables and avoid decorative gradients.

- [ ] **Step 2: Run syntax check**

Run: `node --check src/renderer/app.js`

Expected: PASS.

### Task 4: Renderer Tab Integration

**Files:**
- Modify: `src/renderer/index.html`
- Modify: `src/renderer/app.js`

- [ ] **Step 1: Load tab state module in renderer**

Add this script before `app.js`:

```html
<script src="tab-state.js"></script>
<script src="app.js"></script>
```

Update `tab-state.js` so it also exposes `window.FilePeekTabs` when loaded in the browser.

- [ ] **Step 2: Convert `currentFileData` to active tab derived state**

In `app.js`, initialize:

```js
let tabState = window.FilePeekTabs.createTabState();
let currentFileData = null;
let lastAIResult = null;
```

Add helper functions:

```js
function getActiveDocumentTab() {
  return window.FilePeekTabs.getActiveTab(tabState);
}

function syncActiveFileState() {
  const activeTab = getActiveDocumentTab();
  currentFileData = activeTab?.data || null;
  lastAIResult = activeTab?.aiResult || null;
}
```

- [ ] **Step 3: Make `loadFile` create or reuse tabs**

Update `loadFile(filePath, autoAnalyze = false)` to call `openLoadingTab`, render tabs immediately, skip file reading when reused, and store success/error into the right tab id.

- [ ] **Step 4: Render active tab UI**

Add `renderTabs()`, `renderActiveTab()`, `renderNewTabView()`, and `renderTabError()` so the visible file info, preview, AI result, address bar, and empty state always match `activeTabId`.

- [ ] **Step 5: Wire tab clicks and close buttons**

Each `.document-tab` click calls `setActiveTab`; close button calls `closeTab` and stops propagation.

- [ ] **Step 6: Preserve AI result per active tab**

Update `showResult(title, content)` and `showError(message)` to write `aiResult` onto the active tab when a tab is active.

- [ ] **Step 7: Verify JavaScript syntax**

Run: `node --check src/renderer/app.js`

Expected: PASS.

- [ ] **Step 8: Run tab tests**

Run: `npm test`

Expected: PASS.

### Task 5: Manual App Verification

**Files:**
- No planned file changes.

- [ ] **Step 1: Build check**

Run: `npm run build`

Expected: Electron builder completes or fails only for an existing packaging/environment issue. If packaging is too slow, run `node --check src/main.js`, `node --check src/preload.js`, and `node --check src/renderer/app.js`.

- [ ] **Step 2: Launch dev app**

Run: `npm start`

Expected: app opens with Chrome-like shell and new-tab empty screen.

- [ ] **Step 3: Manual flows**

Verify:

- Open one file: one tab appears.
- Open a second file: second tab appears.
- Open the first file again: first tab focuses instead of duplicating.
- Close inactive tab: active document remains.
- Close active tab: neighbor selection works.
- AI summary/question uses active tab.
- Reload uses active tab file path.

---

## Self-Review

- Spec coverage: UI shell, new tab screen, per-file tabs, duplicate focusing, close behavior, active-tab AI state, loading/error states, and manual verification are covered.
- Placeholder scan: no TBD/TODO/implement-later placeholders remain.
- Type consistency: plan consistently uses `openTabs`, `activeTabId`, `aiResult`, `status`, and `FilePeekTabs`.
