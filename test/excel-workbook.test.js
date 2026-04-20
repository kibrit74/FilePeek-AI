const test = require("node:test");
const assert = require("node:assert/strict");
const XLSX = require("@e965/xlsx");
const {
  extractWorkbookData,
  createWorksheetFromGrid,
  createWorkbookFromSheets,
} = require("../src/utils/excel-workbook");

test("extractWorkbookData keeps full first sheet rows for the editor", () => {
  const rows = Array.from({ length: 40 }, (_, index) => [
    `Satir ${index + 1}`,
    index + 1,
  ]);

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet([["Ad", "Deger"], ...rows]);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sayfa1");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  const data = extractWorkbookData(buffer);

  assert.equal(data.rows.length, 12);
  assert.equal(data.editorRows.length, 41);
  assert.equal(data.totalRows, 41);
});

test("extractWorkbookData preserves formula text for AI/editor usage", () => {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet([
    ["Tutar", "Toplam"],
    [10, null],
  ]);
  worksheet.B2 = { t: "n", f: "A2*2", v: 20, w: "20" };
  worksheet["!ref"] = "A1:B2";
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sayfa1");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  const data = extractWorkbookData(buffer);

  assert.equal(data.editorRows[1][1].value, "=A2*2");
  assert.match(data.fullText, /formul: =A2\*2/);
});

test("extractWorkbookData does not attach default style objects to every parsed cell", () => {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet([
    ["Ad", "Deger"],
    ["Kalem", 42],
  ]);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sayfa1");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  const data = extractWorkbookData(buffer);

  assert.ok(data.editorRows[0][0]);
  assert.equal("style" in data.editorRows[0][0], false);
  assert.equal(data.editorRows[1][1].displayValue, "42");
});

test("extractWorkbookData limits AI context to sampled rows instead of raw large sheets", () => {
  const rows = Array.from({ length: 260 }, (_, index) => [
    `Kisi ${index + 1}`,
    `Deger ${index + 1}`,
  ]);

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet([["Ad", "Deger"], ...rows]);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sayfa1");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  const data = extractWorkbookData(buffer);

  assert.match(data.sample, /Toplam Satir: 261/);
  assert.match(data.sample, /\[Satir 200\]/);
  assert.doesNotMatch(data.sample, /\[Satir 201\]/);
  assert.doesNotMatch(data.fullText, /\[Satir 201\]/);
  assert.match(data.fullText, /61 satir daha var/);
});

test("createWorksheetFromGrid writes formula cells as excel formulas", () => {
  const worksheet = createWorksheetFromGrid([
    [{ value: "Tutar" }, { value: "Toplam" }],
    [{ value: 10 }, { value: "=A2*2" }],
  ]);

  assert.equal(worksheet.B2.f, "A2*2");
  assert.equal(worksheet.A2.v, 10);
});

test("createWorkbookFromSheets keeps multiple worksheet names and values", () => {
  const workbook = createWorkbookFromSheets([
    {
      name: "Ilk",
      rows: [[{ value: "Baslik" }], [{ value: "Deger 1" }]],
    },
    {
      name: "Ikinci",
      rows: [[{ value: "Baslik" }], [{ value: "Deger 2" }]],
    },
  ]);

  assert.deepEqual(workbook.SheetNames, ["Ilk", "Ikinci"]);
  assert.equal(workbook.Sheets.Ilk.A2.v, "Deger 1");
  assert.equal(workbook.Sheets.Ikinci.A2.v, "Deger 2");
});
