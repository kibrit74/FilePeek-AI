const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

function readLandingPage() {
  return fs.readFileSync("landing-page.html", "utf8");
}

test("landing page download buttons target GitHub release assets", () => {
  const landing = readLandingPage();

  assert.match(
    landing,
    /https:\/\/github\.com\/kibrit74\/FilePeek-AI\/releases\/latest\/download\/FilePeek%20AI%20Setup%201\.0\.0\.exe/
  );
  assert.match(
    landing,
    /https:\/\/github\.com\/kibrit74\/FilePeek-AI\/releases\/latest\/download\/FilePeek%20AI%201\.0\.0\.exe/
  );
  assert.match(landing, /function configureDownloadLinks\(\)/);
  assert.match(landing, /\.download-btn, \.cta-buttons \.btn-primary/);
});

test("landing page social GitHub link points to the release repository", () => {
  const landing = readLandingPage();

  assert.match(landing, /https:\/\/github\.com\/kibrit74\/FilePeek-AI/);
  assert.doesNotMatch(landing, /https:\/\/github\.com\/filepeek\/filepeek-ai/);
});
