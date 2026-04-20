const test = require("node:test");
const assert = require("node:assert/strict");

const { evaluateFormula } = require("../src/renderer/excel-formulas");

const grid = [
  [{ value: "A" }, { value: "B" }],
  [{ value: "10" }, { value: "5" }],
  [{ value: "3" }, { value: "2" }],
];

test("evaluateFormula computes whitelisted spreadsheet arithmetic", () => {
  assert.equal(evaluateFormula("=A2+B2*2", grid), 20);
  assert.equal(evaluateFormula("=SUM(A2:B3)", grid), 20);
  assert.equal(evaluateFormula("=AVERAGE(A2:B3)", grid), 5);
  assert.equal(evaluateFormula("=COUNT(A2:B3)", grid), 4);
});

test("evaluateFormula rejects JavaScript payloads instead of evaluating them", () => {
  assert.equal(evaluateFormula("=A2+globalThis.process.exit()", grid), "#HATA!");
  assert.equal(evaluateFormula("=constructor.constructor('return process')()", grid), "#HATA!");
});
