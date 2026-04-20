const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { EventEmitter } = require("node:events");

const {
  createLocalSTTService,
  DEFAULT_WHISPER_MODEL,
  selectWindowsReleaseAsset,
} = require("../src/utils/local-stt-service");

function createTempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "filepeek-whisper-"));
}

test("local STT status reports missing binary and model", () => {
  const service = createLocalSTTService({ rootDir: createTempRoot() });
  const status = service.getStatus();

  assert.equal(status.ready, false);
  assert.equal(status.model, DEFAULT_WHISPER_MODEL);
  assert.deepEqual(status.missing.sort(), ["binary", "model"]);
});

test("local STT status is ready when whisper binary and model exist", () => {
  const rootDir = createTempRoot();
  fs.mkdirSync(path.join(rootDir, "bin"), { recursive: true });
  fs.mkdirSync(path.join(rootDir, "models"), { recursive: true });
  fs.writeFileSync(path.join(rootDir, "bin", "whisper-cli.exe"), "exe");
  fs.writeFileSync(path.join(rootDir, "models", "ggml-small.bin"), "model");

  const service = createLocalSTTService({ rootDir });
  const status = service.getStatus();

  assert.equal(status.ready, true);
  assert.equal(path.basename(status.executablePath), "whisper-cli.exe");
  assert.equal(path.basename(status.modelPath), "ggml-small.bin");
});

test("local STT transcribes WAV through whisper-cli output text", async () => {
  const rootDir = createTempRoot();
  fs.mkdirSync(path.join(rootDir, "bin"), { recursive: true });
  fs.mkdirSync(path.join(rootDir, "models"), { recursive: true });
  fs.writeFileSync(path.join(rootDir, "bin", "whisper-cli.exe"), "exe");
  fs.writeFileSync(path.join(rootDir, "models", "ggml-small.bin"), "model");

  const calls = [];
  const fakeChildProcess = {
    spawn(executablePath, args) {
      calls.push({ executablePath, args });
      const child = new EventEmitter();
      child.stdout = new EventEmitter();
      child.stderr = new EventEmitter();

      const outputBase = args[args.indexOf("-of") + 1];
      setImmediate(() => {
        fs.writeFileSync(`${outputBase}.txt`, "AHMET OGREN D.T nosu ne?\n", "utf8");
        child.emit("close", 0);
      });

      return child;
    },
  };

  const service = createLocalSTTService({
    rootDir,
    childProcessImpl: fakeChildProcess,
  });

  const transcript = await service.transcribeAudio(Buffer.from("RIFF....WAVE"), "audio/wav");

  assert.equal(transcript, "AHMET OGREN D.T nosu ne?");
  assert.equal(calls.length, 1);
  assert.match(calls[0].executablePath, /whisper-cli\.exe$/);
  assert.deepEqual(calls[0].args.slice(0, 2), ["-m", path.join(rootDir, "models", "ggml-small.bin")]);
  assert.ok(calls[0].args.includes("-l"));
  assert.ok(calls[0].args.includes("tr"));
});

test("release asset selection accepts current x64 CPU zip naming", () => {
  const asset = selectWindowsReleaseAsset({
    assets: [
      { name: "whisper-bin-Win32.zip", browser_download_url: "https://example.com/win32.zip" },
      { name: "whisper-bin-x64.zip", browser_download_url: "https://example.com/x64.zip" },
      { name: "whisper-cublas-12.4.0-bin-x64.zip", browser_download_url: "https://example.com/cublas.zip" },
    ],
  });

  assert.equal(asset?.name, "whisper-bin-x64.zip");
});
