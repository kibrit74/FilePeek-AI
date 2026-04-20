const test = require("node:test");
const assert = require("node:assert/strict");
const {
  getPreviewType,
  getReadablePreviewText,
} = require("../src/renderer/preview-model");

test("normalizes spreadsheet and text preview types", () => {
  assert.equal(getPreviewType({ type: "xls" }), "xlsx");
  assert.equal(getPreviewType({ type: "csv" }), "text");
  assert.equal(getPreviewType({ type: "png" }), "image");
});

test("falls back to fullText when sample is empty", () => {
  assert.equal(
    getReadablePreviewText({ sample: "   ", fullText: "Merhaba dunya" }),
    "Merhaba dunya"
  );
});

test("returns fallback text when no readable content exists", () => {
  assert.equal(
    getReadablePreviewText({ sample: "", fullText: "" }),
    "Bu dosya icin okunabilir bir icerik bulunamadi."
  );
});
