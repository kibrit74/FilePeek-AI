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
  state = setTabAIResult(state, first.tab.id, { title: "Ozet", content: "A sonucu" });

  const second = openLoadingTab(state, "C:/docs/b.docx");
  state = setTabReady(second.state, second.tab.id, { name: "b.docx", type: "docx", sample: "B" });

  assert.equal(state.openTabs[0].aiResult.content, "A sonucu");
  assert.equal(state.openTabs[1].aiResult, null);
});

test("keeps tab open with error status when loading fails", () => {
  let state = createTabState();
  const result = openLoadingTab(state, "C:/docs/broken.pdf");
  state = setTabError(result.state, result.tab.id, "Dosya okunamadi");

  assert.equal(state.openTabs.length, 1);
  assert.equal(getActiveTab(state).status, "error");
  assert.equal(getActiveTab(state).error, "Dosya okunamadi");
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
