const test = require("node:test");
const assert = require("node:assert/strict");
const {
  extractSearchPhrase,
  buildFocusedExcelQuestionContext,
  getWorkbookSearchIndex,
} = require("../src/renderer/excel-search");

function cell(value) {
  return { value: String(value ?? ""), displayValue: String(value ?? ""), formula: "", style: {} };
}

test("extractSearchPhrase removes question noise and keeps the target name", () => {
  assert.equal(
    extractSearchPhrase('AHMET ÖĞREN D.T nosu ne ?'),
    "AHMET ÖĞREN"
  );
});

test("buildFocusedExcelQuestionContext returns only matched row and nearby context", () => {
  const workbookData = {
    sheetData: [
      {
        name: "Sayfa1",
        rows: [
          [cell("Muhatap tanımı"), cell("TC kimlik no"), cell("Durum")],
          [cell("MEHMET YILMAZ"), cell("11111111111"), cell("Pasif")],
          [cell("AHMET ÖĞREN"), cell("45409911250"), cell("Aktif")],
          [cell("AYSE KARA"), cell("22222222222"), cell("Beklemede")],
          [cell("FATMA DEMIR"), cell("33333333333"), cell("Arsiv")],
        ],
      },
    ],
  };

  const result = buildFocusedExcelQuestionContext(workbookData, "AHMET ÖĞREN D.T nosu ne ?");

  assert.equal(result.matches.length, 1);
  assert.equal(result.matches[0].sheetName, "Sayfa1");
  assert.equal(result.matches[0].rowNumber, 3);
  assert.match(result.contextText, /AHMET ÖĞREN/);
  assert.match(result.contextText, /45409911250/);
  assert.match(result.contextText, /AYSE KARA/);
  assert.doesNotMatch(result.contextText, /FATMA DEMIR/);
});

test("getWorkbookSearchIndex caches normalized workbook rows for reuse", () => {
  const workbookData = {
    sheetData: [
      {
        name: "Sayfa1",
        rows: [
          [cell("Ad"), cell("Durum")],
          [cell("AHMET OGREN"), cell("Aktif")],
        ],
      },
    ],
  };

  const firstIndex = getWorkbookSearchIndex(workbookData);
  const secondIndex = getWorkbookSearchIndex(workbookData);

  assert.equal(firstIndex, secondIndex);
  assert.equal(firstIndex.sheets[0].rows[0].joinedText, "ahmet ogren aktif");
});
