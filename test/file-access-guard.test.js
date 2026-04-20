const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const os = require("node:os");

const { createFileAccessGuard } = require("../src/utils/file-access-guard");

test("file access guard rejects renderer supplied paths until the user approves them", () => {
  const guard = createFileAccessGuard({
    supportedExtensions: [".txt", ".xlsx", ".docx"],
    fileExists: (filePath) => filePath.endsWith("allowed.txt") || filePath.endsWith("secret.txt"),
  });

  const secretPath = path.join(os.tmpdir(), "secret.txt");
  const allowedPath = path.join(os.tmpdir(), "allowed.txt");

  assert.equal(guard.canRead(secretPath), false);

  const approved = guard.approveReadablePath(allowedPath);

  assert.equal(guard.canRead(approved), true);
  assert.equal(guard.canRead(allowedPath), true);
  assert.equal(guard.canRead(secretPath), false);
});

test("file access guard allows writes only to opened files or save-dialog results", () => {
  const guard = createFileAccessGuard({
    supportedExtensions: [".docx", ".xlsx"],
    fileExists: (filePath) => filePath.endsWith("opened.xlsx"),
  });

  const openedPath = path.join(os.tmpdir(), "opened.xlsx");
  const randomPath = path.join(os.tmpdir(), "random.xlsx");
  const saveAsPath = path.join(os.tmpdir(), "save-as.xlsx");

  guard.approveReadablePath(openedPath);

  assert.equal(guard.canWrite(openedPath, [".xlsx"]), true);
  assert.equal(guard.canWrite(randomPath, [".xlsx"]), false);

  const approvedSavePath = guard.approveWritablePath(saveAsPath, [".xlsx"]);

  assert.equal(guard.canWrite(approvedSavePath, [".xlsx"]), true);
  assert.equal(guard.canWrite(path.join(os.tmpdir(), "save-as.docx"), [".xlsx"]), false);
});
