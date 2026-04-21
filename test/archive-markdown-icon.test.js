const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

test("Markdown files keep their own preview type and Windows association", () => {
  const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
  const mainSource = fs.readFileSync("src/main.js", "utf8");

  const markdownAssociation = packageJson.build.fileAssociations
    .find(association => association.ext === "md");

  assert.ok(markdownAssociation, "package build must associate .md files");
  assert.equal(markdownAssociation.name, "Markdown Document");
  assert.match(mainSource, /result\.type\s*=\s*ext\s*===\s*"md"\s*\?\s*"md"\s*:\s*"text"/);
});

test("ZIP preview exposes archive hierarchy metadata for nested folders", () => {
  const mainSource = fs.readFileSync("src/main.js", "utf8");
  const rendererSource = fs.readFileSync("src/renderer/app.js", "utf8");
  const stylesSource = fs.readFileSync("src/renderer/styles.css", "utf8");

  assert.match(mainSource, /displayName/);
  assert.match(mainSource, /parentPath/);
  assert.match(mainSource, /depth/);
  assert.match(rendererSource, /function renderZipTree/);
  assert.match(rendererSource, /zip-tree-item/);
  assert.match(stylesSource, /\.zip-tree-item/);
});

test("Packaged app includes runtime icon assets and resolves icon path from resources", () => {
  const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
  const mainSource = fs.readFileSync("src/main.js", "utf8");

  assert.ok(Array.isArray(packageJson.build.extraResources), "runtime icons must be copied as extra resources");
  assert.ok(
    packageJson.build.extraResources.some(resource => (
      resource.from === "build"
      && resource.to === "build"
      && resource.filter.includes("icon.png")
      && resource.filter.includes("icon.ico")
    )),
    "build/icon.png and build/icon.ico must be available in packaged resources"
  );
  assert.match(mainSource, /function getAppIconPath/);
  assert.match(mainSource, /process\.resourcesPath/);
  assert.match(mainSource, /icon:\s*getAppIconPath\(\)/);
});
