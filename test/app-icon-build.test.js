const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("Windows build uses a checked-in ico and keeps executable resource editing enabled", () => {
  const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));

  assert.equal(packageJson.build.afterPack, "build/after-pack.js");
  assert.equal(packageJson.build.win.icon, "build/icon.ico");
  assert.equal(packageJson.build.win.signAndEditExecutable, false);
  assert.deepEqual(packageJson.build.win.signExts, ["!exe"]);
  assert.equal(packageJson.build.nsis.installerIcon, "build/icon.ico");
  assert.equal(packageJson.build.nsis.uninstallerIcon, "build/icon.ico");
  assert.ok(fs.existsSync("build/icon.ico"));
  assert.match(packageJson.scripts["dist:win"], /ELECTRON_BUILDER_DISABLE_BUILD_CACHE=true/);
  assert.match(packageJson.scripts["dist:portable"], /ELECTRON_BUILDER_DISABLE_BUILD_CACHE=true/);
});

test("afterPack hook applies the Windows executable icon through bundled rcedit", () => {
  const hook = fs.readFileSync("build/after-pack.js", "utf8");

  assert.match(hook, /electronPlatformName !== "win32"/);
  assert.match(hook, /require\("resedit"\)/);
  assert.match(hook, /require\("pe-library"\)/);
  assert.match(hook, /build", "icon\.ico"/);
  assert.match(hook, /IconGroupEntry\.replaceIconsForResource/);
  assert.doesNotMatch(hook, /rcedit\.exe/);
});

test("release workflow overwrites existing v1.0.0 assets when the tag is rebuilt", () => {
  const workflow = fs.readFileSync(".github/workflows/release.yml", "utf8");

  assert.match(workflow, /overwrite_files:\s*true/);
});
