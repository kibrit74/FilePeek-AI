const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("GitHub release workflow builds Windows installer and portable assets", () => {
  const workflow = fs.readFileSync(".github/workflows/release.yml", "utf8");

  assert.match(workflow, /tags:\s*\[\s*['"]v\*['"]\s*\]/);
  assert.match(workflow, /npm ci/);
  assert.match(workflow, /npm run dist:win/);
  assert.match(workflow, /npm run dist:portable/);
  assert.match(workflow, /softprops\/action-gh-release@v2/);
  assert.match(workflow, /dist\/FilePeek AI Setup 1\.0\.0\.exe/);
  assert.match(workflow, /dist\/FilePeek AI 1\.0\.0\.exe/);
});
