const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("recent history re-authorizes persisted paths before loading file content", () => {
  const app = fs.readFileSync("src/renderer/app.js", "utf8");
  const preload = fs.readFileSync("src/preload.js", "utf8");
  const main = fs.readFileSync("src/main.js", "utf8");

  assert.match(preload, /authorizeRecentFile:\s*\(filePath\)\s*=>\s*ipcRenderer\.invoke\("authorize-recent-file", filePath\)/);
  assert.match(main, /ipcMain\.handle\("authorize-recent-file"/);
  assert.match(app, /async function openHistoryItem\(filePath\)/);
  assert.match(app, /li\.addEventListener\("click", \(\) => openHistoryItem\(item\.path\)\)/);
});

test("pdf preview loader uses pdfjs-dist mjs assets shipped by current dependency", () => {
  const app = fs.readFileSync("src/renderer/app.js", "utf8");

  assert.match(app, /pdfjs-dist\/build\/pdf\.mjs/);
  assert.match(app, /pdfjs-dist\/build\/pdf\.worker\.mjs/);
  assert.doesNotMatch(app, /pdfjs-dist\/build\/pdf\.min\.js/);
  assert.doesNotMatch(app, /pdfjs-dist\/build\/pdf\.worker\.min\.js/);
});

test("pdf preview includes previous and next page controls wired to page rendering", () => {
  const app = fs.readFileSync("src/renderer/app.js", "utf8");

  assert.match(app, /id="pdf-prev-page"/);
  assert.match(app, /id="pdf-next-page"/);
  assert.match(app, /id="pdf-page-indicator"/);
  assert.match(app, /async function renderPDFPage\(pdfBase64, pageNumber\)/);
  assert.match(app, /prevButton\.addEventListener\("click"/);
  assert.match(app, /nextButton\.addEventListener\("click"/);
});

test("pdf preview supports direct page jump from page number input", () => {
  const app = fs.readFileSync("src/renderer/app.js", "utf8");

  assert.match(app, /id="pdf-page-input"/);
  assert.match(app, /pageInput\.addEventListener\("keydown"/);
  assert.match(app, /if \(event\.key === "Enter"\)/);
  assert.match(app, /currentPage = requestedPage/);
});

test("selected preview text is surfaced as AI question context", () => {
  const app = fs.readFileSync("src/renderer/app.js", "utf8");
  const html = fs.readFileSync("src/renderer/index.html", "utf8");

  assert.match(html, /id="selectedContextBar"/);
  assert.match(html, /id="askSelectionBtn"/);
  assert.match(html, /id="selectionMailBtn"/);
  assert.match(html, /id="selectionCalendarBtn"/);
  assert.match(app, /function updateSelectedPreviewContext\(/);
  assert.match(app, /window\.getSelection\(\)/);
  assert.match(app, /selectedPreviewContext = normalizedText/);
  assert.match(app, /function shouldUseSelectedContextForQuestion\(\)/);
  assert.match(app, /selectedPreviewContext && shouldUseSelectedContextForQuestion\(\)/);
  assert.match(app, /const questionContext = getQuestionContextText\(question\)/);
});

test("selected question scope can be switched between selection-only and full document", () => {
  const app = fs.readFileSync("src/renderer/app.js", "utf8");
  const html = fs.readFileSync("src/renderer/index.html", "utf8");

  assert.match(html, /id="questionContextScopeSelect"/);
  assert.match(html, /value="selection"/);
  assert.match(html, /value="document"/);
  assert.match(app, /const questionContextScopeSelect = document.getElementById\("questionContextScopeSelect"\)/);
  assert.match(app, /function updateQuestionContextScopeUI\(\)/);
  assert.match(app, /questionContextScopeSelect\?\.addEventListener\("change"/);
  assert.match(app, /setQuestionContextScope\("selection"\)/);
});

test("recent files panel includes search and pin controls", () => {
  const app = fs.readFileSync("src/renderer/app.js", "utf8");
  const html = fs.readFileSync("src/renderer/index.html", "utf8");

  assert.match(html, /id="historySearchInput"/);
  assert.match(app, /function getPinnedHistoryPaths\(/);
  assert.match(app, /function togglePinnedHistory\(/);
  assert.match(app, /class="history-item-pin/);
  assert.match(app, /historySearchInput\.addEventListener\("input"/);
});

test("preview renders a file-type specific quick toolbar", () => {
  const app = fs.readFileSync("src/renderer/app.js", "utf8");
  const html = fs.readFileSync("src/renderer/index.html", "utf8");

  assert.match(app, /function getFileQuickActions\(/);
  assert.match(app, /function renderFileQuickToolbar\(/);
  assert.match(html, /class="file-quick-toolbar/);
  assert.match(app, /id: "summarize"/);
});

test("selection actions open review modals for Gmail and Google Calendar drafts", () => {
  const app = fs.readFileSync("src/renderer/app.js", "utf8");
  const html = fs.readFileSync("src/renderer/index.html", "utf8");

  assert.match(html, /id="selectionMailModal"/);
  assert.match(html, /id="selectionCalendarModal"/);
  assert.match(html, /id="selectionMailGenerateBtn"/);
  assert.match(html, /id="selectionCalendarGenerateBtn"/);
  assert.match(html, /id="selectionMailLanguageSelect"/);
  assert.match(html, /id="selectionMailDetailSelect"/);
  assert.match(app, /function openMailDraftModalFromSelection\(/);
  assert.match(app, /async function requestMailDraftFromSelection\(/);
  assert.match(app, /function openCalendarDraftModalFromSelection\(/);
  assert.match(app, /async function requestCalendarDraftFromSelection\(/);
  assert.match(app, /openExternalUrl\(gmailUrl\)/);
  assert.match(app, /openExternalUrl\(calendarUrl\)/);
});

test("selection actions do not send selected text to AI until the user explicitly requests a draft", () => {
  const app = fs.readFileSync("src/renderer/app.js", "utf8");

  assert.match(app, /selectionMailBtn\.addEventListener\("click", \(\) => \{\s*openMailDraftModalFromSelection\(\);/);
  assert.match(app, /selectionCalendarBtn\.addEventListener\("click", \(\) => \{\s*openCalendarDraftModalFromSelection\(\);/);
  assert.match(app, /selectionMailGenerateBtn\?\.addEventListener\("click", async \(\) => \{/);
  assert.match(app, /selectionCalendarGenerateBtn\?\.addEventListener\("click", async \(\) => \{/);
});

test("electron bridge exposes external URL opening for Gmail and calendar drafts", () => {
  const preload = fs.readFileSync("src/preload.js", "utf8");
  const main = fs.readFileSync("src/main.js", "utf8");

  assert.match(preload, /openExternalUrl:\s*\(url\)\s*=>\s*ipcRenderer\.invoke\("open-external-url", url\)/);
  assert.match(main, /ipcMain\.handle\("open-external-url"/);
  assert.match(main, /shell\.openExternal\(safeUrl\)/);
});
