const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createFilePickerActions,
  createBatchHistoryActions,
  createBatchDocumentIndex,
  createVoiceQuestionActions,
} = require("../src/renderer/file-actions");

test("openSingleFile loads the selected file once", async () => {
  const calls = [];
  const actions = createFilePickerActions({
    api: {
      pickFile: async () => "C:/docs/a.pdf"
    },
    loadFile: async (...args) => calls.push(args)
  });

  await actions.openSingleFile();

  assert.deepEqual(calls, [["C:/docs/a.pdf", false]]);
});

test("openSingleFile does nothing when picker is cancelled", async () => {
  const calls = [];
  const actions = createFilePickerActions({
    api: {
      pickFile: async () => null
    },
    loadFile: async (...args) => calls.push(args)
  });

  await actions.openSingleFile();

  assert.deepEqual(calls, []);
});

test("batch history action stores every successfully read file", () => {
  const calls = [];
  const actions = createBatchHistoryActions({
    addToHistory: (...args) => calls.push(args)
  });

  actions.addReadFileToHistory("C:/docs/report.xlsx", {
    name: "report.xlsx",
    type: "xlsx",
    size: 2048
  });

  assert.deepEqual(calls, [["C:/docs/report.xlsx", "report.xlsx", "xlsx", 2048]]);
});

test("voice question action speaks successful AI answers when auto speak is enabled", async () => {
  const spoken = [];
  const actions = createVoiceQuestionActions({
    askQuestion: async () => ({ success: true, answer: "Cevap hazir" }),
    showAIResult: () => {},
    speakText: (text) => spoken.push(text),
    getVoiceState: () => ({ autoSpeakAnswer: true })
  });

  await actions.askAndMaybeSpeak({ text: "belge", question: "ne var?", title: "Soru" });

  assert.deepEqual(spoken, ["Cevap hazir"]);
});

test("batch document index summarizes non-excel files with manifests instead of raw text", () => {
  const longText = "gizli ".repeat(900);
  const index = createBatchDocumentIndex([
    {
      fileName: "dilekce.txt",
      data: { type: "txt", size: 1024 },
      text: `DILEKCE BASLIGI\n14.04.2026 tarihli konu\n${longText}`
    },
    {
      fileName: "tablo.xlsx",
      data: { type: "xlsx" },
      text: "excel ham satir"
    }
  ]);

  assert.equal(index.documents.length, 1);
  assert.match(index.summaryContext, /dilekce\.txt/);
  assert.match(index.summaryContext, /Metin uzunlugu:/);
  assert.doesNotMatch(index.summaryContext, new RegExp("gizli ".repeat(80)));
});

test("batch document index question context sends only matching chunks", () => {
  const index = createBatchDocumentIndex([
    {
      fileName: "rapor.txt",
      data: { type: "txt" },
      text: "Vergi borcu hakkinda detayli bilgi ve 2026 tarihli karar."
    },
    {
      fileName: "not.txt",
      data: { type: "txt" },
      text: "Alakasiz bir belge icerigi."
    }
  ]);

  const context = index.buildQuestionContext("vergi borcu nedir?");

  assert.match(context, /rapor\.txt/);
  assert.match(context, /Vergi borcu/);
  assert.doesNotMatch(context, /Alakasiz/);
});
