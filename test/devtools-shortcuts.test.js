const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const mainPath = path.join(__dirname, "..", "src", "main.js");

test("main process wires DevTools shortcuts for F12 and Ctrl+Shift+I", () => {
  const mainSource = fs.readFileSync(mainPath, "utf8");

  assert.match(mainSource, /globalShortcut\.register\(['"]F12['"]/);
  assert.match(mainSource, /globalShortcut\.register\(['"]CommandOrControl\+Shift\+I['"]/);
  assert.match(mainSource, /toggleDevTools\(/);
});
