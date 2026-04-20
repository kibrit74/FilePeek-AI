const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const projectRoot = path.join(__dirname, "..");

test("windows installer registers FilePeek AI explorer context menu for supported files", () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, "package.json"), "utf8"));
  const installerPath = path.join(projectRoot, "build", "installer.nsh");
  const installer = fs.readFileSync(installerPath, "utf8");

  assert.equal(packageJson.build.nsis.include, "build/installer.nsh");
  assert.match(installer, /!macro customInstall/);
  assert.match(installer, /!macro customUnInstall/);
  assert.match(installer, /FilePeek AI ile Aç/);
  assert.match(installer, /\$INSTDIR\\FilePeek AI\.exe/);

  assert.match(installer, /Software\\Classes\\SystemFileAssociations\\\$\{EXT\}\\shell\\FilePeekAI/);

  for (const extension of [".pdf", ".docx", ".xlsx", ".txt", ".zip", ".udf", ".jpg", ".png", ".gif"]) {
    assert.match(installer, new RegExp(`!insertmacro RegisterFilePeekContextMenu "\\${extension}"`));
    assert.match(installer, new RegExp(`!insertmacro UnregisterFilePeekContextMenu "\\${extension}"`));
  }
});
