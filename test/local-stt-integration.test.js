const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const preloadPath = path.join(__dirname, "..", "src", "preload.js");
const mainPath = path.join(__dirname, "..", "src", "main.js");
const htmlPath = path.join(__dirname, "..", "src", "renderer", "index.html");

test("preload exposes local STT management APIs", () => {
  const preload = fs.readFileSync(preloadPath, "utf8");

  assert.match(preload, /getLocalSTTStatus/);
  assert.match(preload, /installLocalSTT/);
});

test("main process registers local STT IPC handlers", () => {
  const main = fs.readFileSync(mainPath, "utf8");

  assert.match(main, /createLocalSTTService/);
  assert.match(main, /ipcMain\.handle\("local-stt-status"/);
  assert.match(main, /ipcMain\.handle\("local-stt-install"/);
  assert.match(main, /localSTTService\.transcribeAudio/);
});

test("settings modal contains local STT install controls", () => {
  const html = fs.readFileSync(htmlPath, "utf8");

  assert.match(html, /localSTTStatus/);
  assert.match(html, /localSTTInstallBtn/);
  assert.match(html, /whisper\.cpp/);
});
