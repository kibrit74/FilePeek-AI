const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const projectRoot = path.join(__dirname, "..");

function readProjectFile(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

test("file preview has a fullscreen toggle wired through markup, script, and styles", () => {
  const html = readProjectFile("src/renderer/index.html");
  const app = readProjectFile("src/renderer/app.js");
  const css = readProjectFile("src/renderer/styles.css");

  assert.match(html, /id="previewFullscreenBtn"/);
  assert.match(html, /class="[^"]*preview-fullscreen-btn/);
  assert.match(app, /const previewFullscreenBtn = document\.getElementById\("previewFullscreenBtn"\)/);
  assert.match(app, /function setPreviewFullscreen/);
  assert.match(app, /fileInfo\.classList\.toggle\("is-preview-fullscreen"/);
  assert.match(app, /previewFullscreenBtn\.addEventListener\("click"/);
  assert.match(css, /\.file-info\.is-preview-fullscreen/);
  assert.match(css, /\.preview-fullscreen-open/);
});
