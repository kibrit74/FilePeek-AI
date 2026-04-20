const fs = require("node:fs");
const path = require("node:path");
const https = require("node:https");
const childProcess = require("node:child_process");
const JSZip = require("jszip");

const DEFAULT_WHISPER_MODEL = "small";
const MODEL_FILES = Object.freeze({
  small: "ggml-small.bin",
});

const WHISPER_RELEASE_API_URL = "https://api.github.com/repos/ggml-org/whisper.cpp/releases/latest";
const MODEL_BASE_URL = "https://huggingface.co/ggerganov/whisper.cpp/resolve/main";
const TRANSCRIBE_TIMEOUT_MS = 120000;

function ensureDir(fsImpl, dirPath) {
  fsImpl.mkdirSync(dirPath, { recursive: true });
}

function walkFiles(fsImpl, dirPath) {
  if (!fsImpl.existsSync(dirPath)) return [];

  const entries = fsImpl.readdirSync(dirPath, { withFileTypes: true });
  return entries.flatMap(entry => {
    const entryPath = path.join(dirPath, entry.name);
    return entry.isDirectory() ? walkFiles(fsImpl, entryPath) : [entryPath];
  });
}

function findWhisperExecutable(fsImpl, binDir) {
  return walkFiles(fsImpl, binDir)
    .find(filePath => path.basename(filePath).toLowerCase() === "whisper-cli.exe") || "";
}

function downloadBuffer(url, { httpsImpl = https, headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const request = httpsImpl.get(url, {
      headers: {
        "User-Agent": "FilePeek-AI",
        ...headers,
      },
    }, response => {
      if ([301, 302, 303, 307, 308].includes(response.statusCode) && response.headers.location) {
        response.resume?.();
        downloadBuffer(response.headers.location, { httpsImpl, headers }).then(resolve, reject);
        return;
      }

      if (response.statusCode < 200 || response.statusCode >= 300) {
        response.resume?.();
        reject(new Error(`Indirme basarisiz (${response.statusCode}): ${url}`));
        return;
      }

      const chunks = [];
      response.on("data", chunk => chunks.push(chunk));
      response.on("end", () => resolve(Buffer.concat(chunks)));
    });

    request.on("error", reject);
  });
}

function selectWindowsReleaseAsset(releasePayload) {
  const assets = Array.isArray(releasePayload?.assets) ? releasePayload.assets : [];
  return assets.find(asset => {
    const name = String(asset.name || "").toLowerCase();
    return name === "whisper-bin-x64.zip"
      && asset.browser_download_url;
  }) || assets.find(asset => {
    const name = String(asset.name || "").toLowerCase();
    return name.endsWith(".zip")
      && /(whisper).*(bin).*(x64|amd64|64)|(x64|amd64|64).*(whisper).*(bin)/.test(name)
      && !/(cublas|blas|vulkan|openvino)/.test(name)
      && asset.browser_download_url;
  }) || assets.find(asset => {
    const name = String(asset.name || "").toLowerCase();
    return name.endsWith(".zip")
      && /(x64|amd64|64)/.test(name)
      && /bin/.test(name)
      && asset.browser_download_url;
  });
}

async function extractZipToDir(zipBuffer, destinationDir, fsImpl = fs) {
  const zip = await JSZip.loadAsync(zipBuffer);
  const entries = Object.values(zip.files || {}).filter(entry => !entry.dir);

  for (const entry of entries) {
    const normalizedName = path.normalize(entry.name);
    if (normalizedName.startsWith("..") || path.isAbsolute(normalizedName)) {
      continue;
    }

    const outputPath = path.join(destinationDir, normalizedName);
    ensureDir(fsImpl, path.dirname(outputPath));
    fsImpl.writeFileSync(outputPath, await entry.async("nodebuffer"));
  }
}

function createLocalSTTService({
  rootDir,
  fsImpl = fs,
  httpsImpl = https,
  childProcessImpl = childProcess,
  model = DEFAULT_WHISPER_MODEL,
} = {}) {
  if (!rootDir) {
    throw new Error("Local STT rootDir is required");
  }

  const modelFile = MODEL_FILES[model] || MODEL_FILES[DEFAULT_WHISPER_MODEL];
  const binDir = path.join(rootDir, "bin");
  const modelDir = path.join(rootDir, "models");
  const tempDir = path.join(rootDir, "tmp");
  const modelPath = path.join(modelDir, modelFile);
  const modelUrl = `${MODEL_BASE_URL}/${modelFile}`;

  function getExecutablePath() {
    return findWhisperExecutable(fsImpl, binDir);
  }

  function getStatus() {
    const executablePath = getExecutablePath();
    const hasBinary = Boolean(executablePath);
    const hasModel = fsImpl.existsSync(modelPath);
    const missing = [];

    if (!hasBinary) missing.push("binary");
    if (!hasModel) missing.push("model");

    return {
      ready: hasBinary && hasModel,
      model,
      modelFile,
      executablePath,
      modelPath,
      missing,
    };
  }

  async function install() {
    ensureDir(fsImpl, binDir);
    ensureDir(fsImpl, modelDir);
    ensureDir(fsImpl, tempDir);

    if (!getExecutablePath()) {
      const releaseBuffer = await downloadBuffer(WHISPER_RELEASE_API_URL, {
        httpsImpl,
        headers: { Accept: "application/vnd.github+json" },
      });
      const releasePayload = JSON.parse(releaseBuffer.toString("utf8"));
      const asset = selectWindowsReleaseAsset(releasePayload);
      if (!asset?.browser_download_url) {
        throw new Error("whisper.cpp Windows x64 binary release asset bulunamadi");
      }

      const zipBuffer = await downloadBuffer(asset.browser_download_url, { httpsImpl });
      await extractZipToDir(zipBuffer, binDir, fsImpl);
    }

    if (!fsImpl.existsSync(modelPath)) {
      const modelBuffer = await downloadBuffer(modelUrl, { httpsImpl });
      fsImpl.writeFileSync(modelPath, modelBuffer);
    }

    const status = getStatus();
    if (!status.ready) {
      throw new Error(`whisper.cpp kurulumu tamamlanamadi: ${status.missing.join(", ")}`);
    }

    return status;
  }

  function transcribeAudio(audioBuffer, mimeType = "audio/wav") {
    const status = getStatus();
    if (!status.ready) {
      const missingText = status.missing.includes("binary")
        ? "whisper.cpp kurulu degil"
        : "Whisper modeli kurulu degil";
      const error = new Error(missingText);
      error.code = "LOCAL_STT_NOT_READY";
      error.status = status;
      throw error;
    }

    if (!Buffer.isBuffer(audioBuffer) || !audioBuffer.length) {
      throw new Error("Ses verisi eksik");
    }

    if (!/^audio\/(wav|wave|x-wav)\b/i.test(String(mimeType))) {
      throw new Error("Lokal ses tanima icin WAV ses verisi gerekiyor");
    }

    ensureDir(fsImpl, tempDir);
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const wavPath = path.join(tempDir, `${id}.wav`);
    const outputBase = path.join(tempDir, `${id}-out`);
    const outputTextPath = `${outputBase}.txt`;

    fsImpl.writeFileSync(wavPath, audioBuffer);

    const args = [
      "-m", status.modelPath,
      "-f", wavPath,
      "-l", "tr",
      "-otxt",
      "-of", outputBase,
    ];

    return new Promise((resolve, reject) => {
      let stderr = "";
      const child = childProcessImpl.spawn(status.executablePath, args, {
        windowsHide: true,
      });

      const timeout = setTimeout(() => {
        child.kill?.();
        reject(new Error("Lokal ses tanima zaman asimina ugradi"));
      }, TRANSCRIBE_TIMEOUT_MS);

      child.stderr?.on("data", chunk => {
        stderr += chunk.toString();
      });

      child.on("error", error => {
        clearTimeout(timeout);
        reject(error);
      });

      child.on("close", code => {
        clearTimeout(timeout);
        try {
          if (code !== 0) {
            reject(new Error(stderr.trim() || `whisper.cpp cikis kodu: ${code}`));
            return;
          }

          const transcript = fsImpl.existsSync(outputTextPath)
            ? fsImpl.readFileSync(outputTextPath, "utf8").trim()
            : "";

          if (!transcript) {
            reject(new Error("Ses yazıya çevrilemedi"));
            return;
          }

          resolve(transcript);
        } finally {
          for (const tempPath of [wavPath, outputTextPath]) {
            try {
              if (fsImpl.existsSync(tempPath)) fsImpl.unlinkSync(tempPath);
            } catch (_error) {
              // Temp temizliği başarısız olursa transkripsiyon sonucunu bozma.
            }
          }
        }
      });
    });
  }

  return {
    getStatus,
    install,
    transcribeAudio,
  };
}

module.exports = {
  createLocalSTTService,
  DEFAULT_WHISPER_MODEL,
  MODEL_FILES,
  selectWindowsReleaseAsset,
};
