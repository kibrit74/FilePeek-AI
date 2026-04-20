const test = require("node:test");
const assert = require("node:assert/strict");
const {
  calculateVisibleRange,
} = require("../src/renderer/excel-virtualization");

test("calculateVisibleRange renders only visible rows with overscan", () => {
  const range = calculateVisibleRange({
    rowCount: 8501,
    rowHeight: 38,
    viewportHeight: 380,
    scrollTop: 760,
    overscan: 3,
  });

  assert.deepEqual(range, {
    startRow: 17,
    endRow: 32,
    paddingTop: 646,
    paddingBottom: (8501 - 33) * 38,
    totalHeight: 8501 * 38,
  });
});

test("calculateVisibleRange clamps around the start of the sheet", () => {
  const range = calculateVisibleRange({
    rowCount: 20,
    rowHeight: 40,
    viewportHeight: 160,
    scrollTop: 0,
    overscan: 2,
  });

  assert.deepEqual(range, {
    startRow: 0,
    endRow: 5,
    paddingTop: 0,
    paddingBottom: 14 * 40,
    totalHeight: 20 * 40,
  });
});
