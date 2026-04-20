const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const projectRoot = path.join(__dirname, "..");
const checkedFiles = [
  "src/renderer/app.js",
  "src/renderer/index.html",
  "src/renderer/preview.html",
  "src/renderer/styles.css",
  "src/main.js",
  "src/utils/ai-service.js",
];

test("renderer and main sources do not contain mojibake Turkish text", () => {
  const mojibakePattern = new RegExp([
    String.fromCharCode(0x00c3),
    String.fromCharCode(0x00c4),
    String.fromCharCode(0x00c5),
    String.fromCharCode(0x00c2),
    String.fromCharCode(0x00e2),
    "\ufffd",
  ].join("|"));

  for (const relativePath of checkedFiles) {
    const content = fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
    assert.doesNotMatch(content, mojibakePattern, `${relativePath} contains mojibake text`);
  }
});

test("core Turkish labels are encoded as readable UTF-8", () => {
  const app = fs.readFileSync(path.join(projectRoot, "src/renderer/app.js"), "utf8");
  const html = fs.readFileSync(path.join(projectRoot, "src/renderer/index.html"), "utf8");

  for (const label of ["Dosya Aç", "Toplu İşlem", "Özetle", "Çevir", "Tam ekrandan çık"]) {
    assert.match(app + html, new RegExp(label));
  }
});

test("main process startup log is terminal-safe ASCII", () => {
  const main = fs.readFileSync(path.join(projectRoot, "src/main.js"), "utf8");
  assert.match(main, /console\.log\("KankaAI Main Process started!"\)/);
});
