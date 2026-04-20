const path = require("path");
const fs = require("fs");
const { app, BrowserWindow, ipcMain, dialog, Menu, globalShortcut, safeStorage, session, shell } = require("electron");

function configureAppStorage() {
  const userDataPath = path.join(app.getPath("appData"), "FilePeek AI");
  const sessionDataPath = path.join(userDataPath, "SessionData");

  try {
    fs.mkdirSync(sessionDataPath, { recursive: true });
    app.setPath("userData", userDataPath);
    app.setPath("sessionData", sessionDataPath);
  } catch (error) {
    console.warn("Uygulama depolama yolu ayarlanamadi:", error.message);
  }
}

configureAppStorage();
app.commandLine.appendSwitch("disable-http-cache");
app.commandLine.appendSwitch("disable-gpu-shader-disk-cache");

// Paketlenmiş uygulamada .env dosyasını doğru konumdan oku
if (!app.isPackaged) {
  require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
}
const XLSX = require("@e965/xlsx");
const JSZip = require("jszip");
const mammoth = require("mammoth");
const pdfParse = require("pdf-parse");
const { Document, Packer, Paragraph, TextRun, HeadingLevel } = require("docx");
const { createAISettingsStore } = require("./utils/ai-settings-store");
const { createAIService } = require("./utils/ai-service");
const { extractWorkbookData, createWorkbookFromSheets } = require("./utils/excel-workbook");
const { createFileAccessGuard } = require("./utils/file-access-guard");
const { createLocalSTTService } = require("./utils/local-stt-service");

const SUPPORTED_EXTENSIONS = [
  ".pdf", ".docx", ".xlsx", ".xls", ".txt", ".md", ".csv", ".zip",
  ".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".udf"
];
const WORD_SAVE_EXTENSIONS = [".docx"];
const EXCEL_SAVE_EXTENSIONS = [".xlsx", ".xls"];
const MAX_FILE_BYTES = 100 * 1024 * 1024;
const MAX_ZIP_ENTRIES = 2500;
const MAX_ZIP_UNCOMPRESSED_BYTES = 250 * 1024 * 1024;

let mainWindow;
let previewWindow = null;
let pendingFilePath = null;
let queuedFileToOpen = null;
let previewTransitioning = false;
const shouldAutoOpenDevTools = process.env.FILEPEEK_DEBUG === "1" || process.env.ELECTRON_DEBUG === "1";

const aiSettingsStore = createAISettingsStore({
  filePath: path.join(app.getPath("userData"), "ai-settings.json"),
  safeStorage,
});

const aiService = createAIService({
  settingsStore: aiSettingsStore,
});

const localSTTService = createLocalSTTService({
  rootDir: path.join(app.getPath("userData"), "whisper"),
});

const fileAccessGuard = createFileAccessGuard({
  supportedExtensions: SUPPORTED_EXTENSIONS,
  fileExists: fs.existsSync,
  directoryExists: fs.existsSync,
});

function configureMediaPermissions(targetWindow) {
  const allowedPermissions = new Set(["media", "audioCapture"]);
  const targetSession = targetWindow.webContents.session || session.defaultSession;

  targetSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const isTargetWindow = webContents === targetWindow.webContents;
    callback(isTargetWindow && allowedPermissions.has(permission));
  });

  targetSession.setPermissionCheckHandler((webContents, permission) => {
    return webContents === targetWindow.webContents && allowedPermissions.has(permission);
  });
}

function getZipEntryStats(zip) {
  const entries = Object.values(zip.files || {});
  const totalUncompressedSize = entries.reduce((total, file) => {
    const size = Number(file?._data?.uncompressedSize || 0);
    return total + (Number.isFinite(size) ? size : 0);
  }, 0);

  return {
    entryCount: entries.length,
    totalUncompressedSize,
  };
}

function enforceZipLimits(zip) {
  const { entryCount, totalUncompressedSize } = getZipEntryStats(zip);
  if (entryCount > MAX_ZIP_ENTRIES) {
    throw new Error(`Arsiv cok fazla oge iceriyor (${entryCount}). Limit: ${MAX_ZIP_ENTRIES}`);
  }
  if (totalUncompressedSize > MAX_ZIP_UNCOMPRESSED_BYTES) {
    throw new Error(`Arsiv acildiginda cok buyuk (${Math.round(totalUncompressedSize / 1024 / 1024)} MB). Limit: ${Math.round(MAX_ZIP_UNCOMPRESSED_BYTES / 1024 / 1024)} MB`);
  }
}

function getFocusedAppWindow() {
  return BrowserWindow.getFocusedWindow() || previewWindow || mainWindow || null;
}

function toggleFocusedWindowDevTools() {
  const activeWindow = getFocusedAppWindow();
  if (!activeWindow) return;
  activeWindow.webContents.toggleDevTools();
}

// Ana pencereyi oluştur
function createWindow(show = true) {
  if (mainWindow) {
    if (show && !mainWindow.isVisible()) {
      mainWindow.show();
    }
    return mainWindow;
  }

  // Menüyü tamamen kaldır
  Menu.setApplicationMenu(null);
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, "../build/icon.png"),
  });

  configureMediaPermissions(mainWindow);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.once("ready-to-show", () => {
    if (show) {
      mainWindow.show();
    }
    if (shouldAutoOpenDevTools) {
      mainWindow.webContents.openDevTools({ mode: "detach" });
    }
  });

  mainWindow.webContents.on("did-finish-load", () => {
    if (queuedFileToOpen) {
      mainWindow.webContents.send("open-file-path", queuedFileToOpen);
      queuedFileToOpen = null;
    }
  });

  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));
  
  return mainWindow;
}

function createPreviewWindow(filePath) {
  if (previewWindow) {
    previewWindow.focus();
    previewWindow.webContents.send("preview-open-file", filePath);
    return;
  }

  previewWindow = new BrowserWindow({
    width: 520,
    height: 420,
    resizable: false,
    fullscreenable: false,
    minimizable: false,
    maximizable: false,
    show: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, "../build/icon.png"),
  });

  previewWindow.on("closed", () => {
    previewWindow = null;
    if (previewTransitioning) {
      previewTransitioning = false;
      return;
    }
    pendingFilePath = null;
    queuedFileToOpen = null;
    // Kullanıcı önizlemeyi kapattıysa uygulamayı kapat
    if (!mainWindow || !mainWindow.isVisible()) {
      if (mainWindow) {
        mainWindow.close();
      } else {
        app.quit();
      }
    }
  });

  previewWindow.loadFile(path.join(__dirname, "renderer", "preview.html"));

  previewWindow.webContents.once("did-finish-load", () => {
    if (shouldAutoOpenDevTools) {
      previewWindow?.webContents.openDevTools({ mode: "detach" });
    }
    previewWindow?.webContents.send("preview-open-file", filePath);
  });
}

function sendFileToMainWindow(filePath) {
  const approvedPath = fileAccessGuard.approveReadablePath(filePath);
  if (!approvedPath) return;

  if (!mainWindow) {
    queuedFileToOpen = approvedPath;
    return;
  }

  if (mainWindow.webContents.isLoading()) {
    queuedFileToOpen = approvedPath;
  } else {
    mainWindow.webContents.send("open-file-path", approvedPath);
  }
}

function getSupportedFileFromArgs(args) {
  if (!args || !args.length) return null;
  return args.find(arg => SUPPORTED_EXTENSIONS.includes(path.extname(arg).toLowerCase()));
}

function handleFileOpen(filePath, { forcePreview = true } = {}) {
  const approvedPath = fileAccessGuard.approveReadablePath(filePath);
  if (!approvedPath) {
    return;
  }

  pendingFilePath = approvedPath;

  if (!mainWindow) {
    createWindow(forcePreview ? false : true);
  }

  if (!forcePreview) {
    sendFileToMainWindow(approvedPath);
    if (mainWindow && !mainWindow.isVisible()) {
      mainWindow.show();
    }
    return;
  }

  createPreviewWindow(approvedPath);
}

// Uygulama hazır olunca pencereyi aç
app.whenReady().then(() => {
  const initialFile = getSupportedFileFromArgs(process.argv);
  if (initialFile && fs.existsSync(initialFile)) {
    handleFileOpen(initialFile, { forcePreview: true });
  } else {
    createWindow(true);
  }
  
  // Klavye kısayolları
  globalShortcut.register('CommandOrControl+Shift+R', () => {
    console.log('Ctrl+Shift+R basıldı - Uygulama yeniden başlatılıyor...');
    app.relaunch();
    app.exit();
  });
  
  // F5 ile sayfayı yenile
  globalShortcut.register('F5', () => {
    if (mainWindow) {
      mainWindow.reload();
    }
  });

  globalShortcut.register('F12', () => {
    toggleFocusedWindowDevTools();
  });
  
  // Ctrl+R ile sayfayı yenile
  globalShortcut.register('CommandOrControl+R', () => {
    if (mainWindow) {
      mainWindow.reload();
    }
  });

  globalShortcut.register('CommandOrControl+Shift+I', () => {
    toggleFocusedWindowDevTools();
  });

  // macOS için: dock'tan tıklanınca pencere aç
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow(true);
    }
  });
});

// Tüm pencereler kapatılınca uygulamayı kapat (macOS hariç)
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Dosya seçme dialogu
ipcMain.handle("pick-file", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openFile"],
    filters: [
      {
        name: "Desteklenen Dosyalar",
        extensions: ["pdf", "docx", "xlsx", "xls", "txt", "md", "csv", "zip", "jpg", "jpeg", "png", "gif", "webp", "bmp", "udf"],
      },
      { name: "Resimler", extensions: ["jpg", "jpeg", "png", "gif", "webp", "bmp"] },
      { name: "Belgeler", extensions: ["pdf", "docx", "xlsx", "txt", "udf"] },
      { name: "Tüm Dosyalar", extensions: ["*"] },
    ],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return fileAccessGuard.approveReadablePath(result.filePaths[0]) || null;
});

// Çoklu dosya seçme dialogu
ipcMain.handle("pick-multiple-files", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openFile", "multiSelections"],
    filters: [
      {
        name: "Desteklenen Dosyalar",
        extensions: ["pdf", "docx", "xlsx", "xls", "txt", "md", "csv", "zip", "udf"],
      },
      { name: "Tüm Dosyalar", extensions: ["*"] },
    ],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return [];
  }

  return fileAccessGuard.approveReadablePaths(result.filePaths);
});

ipcMain.handle("authorize-dropped-file-path", async (_event, filePath) => {
  return fileAccessGuard.approveReadablePath(filePath) || null;
});

ipcMain.handle("authorize-recent-file", async (_event, filePath) => {
  return fileAccessGuard.approveReadablePath(filePath) || null;
});

ipcMain.handle("open-full-view", async (_event, filePath) => {
  const targetPath = fileAccessGuard.canRead(filePath) ? fileAccessGuard.normalizePath(filePath) : pendingFilePath;
  if (!targetPath || !fileAccessGuard.canRead(targetPath)) {
    return { success: false, error: "Dosya bulunamadı" };
  }

  pendingFilePath = null;

  if (!mainWindow) {
    createWindow(true);
  } else {
    if (!mainWindow.isVisible()) {
      mainWindow.show();
    }
    mainWindow.focus();
  }

  sendFileToMainWindow(targetPath);

  if (previewWindow) {
    previewTransitioning = true;
    previewWindow.close();
  }

  return { success: true };
});

// Dosya içeriğini okuma
ipcMain.handle("peek-file", async (_event, filePath) => {
  try {
    const approvedPath = fileAccessGuard.normalizePath(filePath);
    if (!approvedPath || !fileAccessGuard.canRead(approvedPath) || !fs.existsSync(approvedPath)) {
      return { error: "Dosya bulunamadı" };
    }

    const stats = fs.statSync(approvedPath);
    if (stats.size > MAX_FILE_BYTES) {
      return { error: `Dosya cok buyuk. Limit: ${Math.round(MAX_FILE_BYTES / 1024 / 1024)} MB` };
    }

    const buffer = fs.readFileSync(approvedPath);
    const ext = path.extname(approvedPath).toLowerCase().replace(".", "");
    const name = path.basename(approvedPath);

    let result = { name, type: ext, size: stats.size, path: approvedPath };

    // PDF dosyası
    if (ext === "pdf") {
      const data = await pdfParse(buffer);
      result.type = "pdf";
      result.pages = data.numpages;
      result.sample = (data.text || "").slice(0, 1500);
      result.fullText = data.text || "";
      // PDF buffer'ını base64 olarak gönder (renderer'da render için)
      result.pdfData = buffer.toString('base64');
    }
    // Word dosyası
    else if (ext === "docx") {
      const { value } = await mammoth.extractRawText({ buffer });
      result.type = "docx";
      result.sample = (value || "").slice(0, 1500);
      result.fullText = value || "";
    }
    // Excel dosyası
    else if (ext === "xlsx" || ext === "xls") {
      Object.assign(result, extractWorkbookData(buffer));
    }
    // ZIP dosyası
    else if (ext === "zip") {
      const zip = await JSZip.loadAsync(buffer);
      enforceZipLimits(zip);
      const entries = [];
      
      zip.forEach((relativePath, file) => {
        entries.push({
          name: relativePath,
          isFolder: file.dir,
          size: file._data ? file._data.uncompressedSize : 0
        });
      });

      result.type = "zip";
      result.entries = entries;
      result.totalFiles = entries.length;
      
      // ZIP içeriğini metin olarak listele
      result.fullText = "ZIP İçeriği:\n" + 
        entries.map(e => `${e.isFolder ? "📁" : "📄"} ${e.name}`).join("\n");
      result.sample = result.fullText.slice(0, 1500);
    }
    // Resim dosyası
    else if (ext === "jpg" || ext === "jpeg" || ext === "png" || ext === "gif" || ext === "webp" || ext === "bmp") {
      result.type = "image";
      result.mimeType = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
      result.base64 = buffer.toString('base64');
      result.size = buffer.length;
      result.imageData = `data:${result.mimeType};base64,${result.base64}`;
    }
    // UDF dosyası (hukuk belgeleri için - ZIP tabanlı format)
    else if (ext === "udf") {
      try {
        // UDF dosyaları genellikle sıkıştırılmış ZIP formatındadır
        const JSZip = require("jszip");
        const zip = await JSZip.loadAsync(buffer);
        enforceZipLimits(zip);
        
        let extractedText = "";
        let fullText = "";
        
        // Sadece content.xml dosyasını oku (asıl belge içeriği)
        const contentFile = zip.files["content.xml"];
        
        if (contentFile) {
          try {
            const content = await contentFile.async("string");
            extractedText = content;
            fullText = content;
          } catch (err) {
            extractedText = "⚠️ İçerik okunamadı";
            fullText = extractedText;
          }
        } else {
          // Eğer content.xml yoksa, tüm dosyaları listele
          extractedText = "📄 UDF Dosyası İçeriği:\n\n";
          for (const [filename, file] of Object.entries(zip.files)) {
            if (!file.dir && !filename.endsWith('.sgn') && !filename.endsWith('.p7s')) {
              try {
                const content = await file.async("string");
                extractedText += `\n📑 ${filename}\n${"─".repeat(50)}\n`;
                extractedText += content.substring(0, 500) + (content.length > 500 ? "\n..." : "") + "\n";
              } catch (err) {
                // Hata varsa atla
              }
            }
          }
          fullText = extractedText;
        }
        
        result.type = "udf";
        result.sample = extractedText.slice(0, 2000);
        result.fullText = fullText || extractedText;
        
      } catch (zipError) {
        // ZIP olarak açılamadıysa, düz metin olarak dene
        try {
          const text = buffer.toString("utf8");
          const weirdChars = (text.match(/[\x00-\x08\x0B-\x0C\x0E-\x1F]/g) || []).length;
          
          if (weirdChars < text.length * 0.1) {
            result.type = "udf";
            result.sample = text.slice(0, 1500);
            result.fullText = text;
          } else {
            // Binary dosya
            result.type = "udf";
            result.sample = "⚠️ UDF Dosyası Uyarısı\n\nBu dosya şifreli veya özel bir binary formatta olduğu için içeriği görüntülenemiyor.\n\nDosya boyutu: " + (buffer.length / 1024).toFixed(2) + " KB";
            result.fullText = result.sample;
          }
        } catch (error) {
          result.type = "udf";
          result.sample = "⚠️ UDF dosyası okunamadı.\nDosya boyutu: " + (buffer.length / 1024).toFixed(2) + " KB";
          result.fullText = result.sample;
        }
      }
    }
    // Metin dosyası
    else {
      const text = buffer.toString("utf8");
      result.type = "text";
      result.sample = text.slice(0, 1500);
      result.fullText = text;
    }

    return result;
  } catch (error) {
    console.error("Dosya okuma hatası:", error);
    return { error: `Dosya okunamadı: ${error.message}` };
  }
});

// AI özetleme
ipcMain.handle("ai-summary", async (_event, text) => {
  try {
    if (!text || text.trim().length === 0) {
      return { success: false, error: "Özetlenecek metin yok" };
    }

    const summary = await aiService.summarize(text);
    return { success: true, summary };
  } catch (error) {
    console.error("AI özetleme hatası:", error);
    return { 
      success: false, 
      error: error.message || "Özetleme başarısız oldu" 
    };
  }
});

// AI soru-cevap
ipcMain.handle("ai-question", async (_event, text, question) => {
  try {
    if (!text || text.trim().length === 0) {
      return { success: false, error: "Belge içeriği yok" };
    }
    
    if (!question || question.trim().length === 0) {
      return { success: false, error: "Soru girilmedi" };
    }

    const answer = await aiService.askQuestion(text, question);
    return { success: true, answer };
  } catch (error) {
    console.error("AI soru-cevap hatası:", error);
    return { 
      success: false, 
      error: error.message || "Soru cevaplanamadı" 
    };
  }
});

ipcMain.handle("ai-transcribe-audio", async (_event, base64Audio, mimeType) => {
  try {
    if (!base64Audio || !mimeType) {
      return { success: false, error: "Ses verisi eksik" };
    }

    const audioBuffer = Buffer.from(base64Audio, "base64");
    const transcript = await localSTTService.transcribeAudio(audioBuffer, mimeType);
    return { success: true, transcript };
  } catch (error) {
    console.error("Lokal ses yazıya çevirme hatası:", error);
    return {
      success: false,
      error: error.message || "Ses yazıya çevrilemedi",
      needsLocalSTTInstall: error.code === "LOCAL_STT_NOT_READY",
    };
  }
});

ipcMain.handle("local-stt-status", async () => {
  return localSTTService.getStatus();
});

ipcMain.handle("local-stt-install", async () => {
  try {
    const status = await localSTTService.install();
    return { success: true, status };
  } catch (error) {
    return {
      success: false,
      error: error.message || "Lokal ses tanıma kurulamadı",
      status: localSTTService.getStatus(),
    };
  }
});

// AI resim analizi
ipcMain.handle("ai-analyze-image", async (_event, base64Data, mimeType) => {
  try {
    if (!base64Data || !mimeType) {
      return { success: false, error: "Resim verisi eksik" };
    }

    const buffer = Buffer.from(base64Data, 'base64');
    const description = await aiService.analyzeImage(buffer, mimeType);
    return { success: true, description };
  } catch (error) {
    console.error("AI resim analizi hatası:", error);
    return { 
      success: false, 
      error: error.message || "Resim analizi başarısız oldu" 
    };
  }
});

ipcMain.handle("ai-analyze-image-quick", async (_event, base64Data, mimeType) => {
  try {
    if (!base64Data || !mimeType) {
      return { success: false, error: "Resim verisi eksik" };
    }

    const description = await aiService.quickDescribeImage(base64Data, mimeType);
    return { success: true, description };
  } catch (error) {
    console.error("Hızlı resim betimleme hatası:", error);
    return { 
      success: false, 
      error: error.message || "Hızlı betimleme başarısız oldu" 
    };
  }
});

// AI resim soru-cevap
ipcMain.handle("ai-image-question", async (_event, base64Data, mimeType, question) => {
  try {
    if (!base64Data || !mimeType) {
      return { success: false, error: "Resim verisi eksik" };
    }
    
    if (!question || question.trim().length === 0) {
      return { success: false, error: "Soru girilmedi" };
    }

    const buffer = Buffer.from(base64Data, 'base64');
    const answer = await aiService.askImageQuestion(buffer, mimeType, question);
    return { success: true, answer };
  } catch (error) {
    console.error("AI resim soru-cevap hatası:", error);
    return { 
      success: false, 
      error: error.message || "Soru cevaplanamadı" 
    };
  }
});

ipcMain.handle("ai-settings-get", async () => {
  return aiService.getPublicSettings();
});

ipcMain.handle("ai-settings-save", async (_event, payload) => {
  try {
    const settings = aiService.updateSettings(payload || {});
    return { success: true, settings };
  } catch (error) {
    return {
      success: false,
      error: error.message || "AI ayarları kaydedilemedi",
    };
  }
});

ipcMain.handle("ai-models-list", async (_event, providerId, overrides) => {
  try {
    const models = await aiService.listModels(providerId, overrides || {});
    return { success: true, models };
  } catch (error) {
    return {
      success: false,
      error: error.message || "Model listesi alınamadı",
    };
  }
});

ipcMain.handle("ai-provider-test", async (_event, providerId, overrides) => {
  try {
    const result = await aiService.testProviderConnection(providerId, overrides || {});
    return { success: true, result };
  } catch (error) {
    return {
      success: false,
      error: error.message || "Sağlayıcı bağlantısı test edilemedi",
    };
  }
});

ipcMain.handle("ollama-pull-model", async (_event, payload) => {
  try {
    const result = await aiService.pullOllamaModel(payload || {});
    return { success: true, result };
  } catch (error) {
    return {
      success: false,
      error: error.message || "Ollama modeli indirilemedi",
    };
  }
});

// Tek instance kontrolü (aynı anda birden fazla pencere açılmasın)
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", (_event, commandLine) => {
    const fileArg = getSupportedFileFromArgs(commandLine);
    if (fileArg && fs.existsSync(fileArg)) {
      handleFileOpen(fileArg, { forcePreview: true });
    } else if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// Word dosyası kaydetme
ipcMain.handle("save-word", async (_event, filePath, htmlContent) => {
  try {
    const approvedPath = fileAccessGuard.normalizePath(filePath);
    if (!fileAccessGuard.canWrite(approvedPath, WORD_SAVE_EXTENSIONS)) {
      return { success: false, error: "Bu kaydetme konumu kullanici tarafindan onaylanmadi" };
    }

    // HTML içeriğini parse edip Word dosyasına çevir
    const paragraphs = [];
    const tempDiv = htmlContent.split('\n');
    
    for (const line of tempDiv) {
      if (line.trim() === '') continue;
      
      // Başlıkları tespit et
      if (line.startsWith('<h1>')) {
        const text = line.replace(/<\/?h1>/g, '').trim();
        paragraphs.push(
          new Paragraph({
            text: text,
            heading: HeadingLevel.HEADING_1,
          })
        );
      } else if (line.startsWith('<h2>')) {
        const text = line.replace(/<\/?h2>/g, '').trim();
        paragraphs.push(
          new Paragraph({
            text: text,
            heading: HeadingLevel.HEADING_2,
          })
        );
      } else if (line.startsWith('<h3>')) {
        const text = line.replace(/<\/?h3>/g, '').trim();
        paragraphs.push(
          new Paragraph({
            text: text,
            heading: HeadingLevel.HEADING_3,
          })
        );
      } else {
        // Normal metin - bold, italic, underline kontrolü
        const text = line.replace(/<[^>]+>/g, '');
        const runs = [];
        
        const hasBold = line.includes('<b>') || line.includes('<strong>');
        const hasItalic = line.includes('<i>') || line.includes('<em>');
        const hasUnderline = line.includes('<u>');
        
        runs.push(
          new TextRun({
            text: text,
            bold: hasBold,
            italics: hasItalic,
            underline: hasUnderline ? {} : undefined,
          })
        );
        
        paragraphs.push(new Paragraph({ children: runs }));
      }
    }
    
    const doc = new Document({
      sections: [{
        properties: {},
        children: paragraphs,
      }],
    });
    
    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(approvedPath, buffer);
    
    return { success: true, message: "Word dosyası kaydedildi!" };
  } catch (error) {
    console.error("Word kaydetme hatası:", error);
    return { success: false, error: error.message };
  }
});

// Excel dosyası kaydetme
ipcMain.handle("save-excel", async (_event, filePath, data) => {
  try {
    const approvedPath = fileAccessGuard.normalizePath(filePath);
    if (!fileAccessGuard.canWrite(approvedPath, EXCEL_SAVE_EXTENSIONS)) {
      return { success: false, error: "Bu kaydetme konumu kullanici tarafindan onaylanmadi" };
    }

    const workbook = Array.isArray(data?.sheets) && data.sheets.length
      ? createWorkbookFromSheets(data.sheets)
      : createWorkbookFromSheets([{ name: data?.sheetName || "Sheet1", rows: data?.rows || [] }]);
    XLSX.writeFile(workbook, approvedPath);
    
    return { success: true, message: "Excel dosyası kaydedildi!" };
  } catch (error) {
    console.error("Excel kaydetme hatası:", error);
    return { success: false, error: error.message };
  }
});

// Farklı kaydet dialog'u
ipcMain.handle("save-file-dialog", async (_event, defaultPath, filters) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultPath,
    filters: filters || [
      { name: "Tüm Dosyalar", extensions: ["*"] }
    ],
  });
  
  if (result.canceled) {
    return null;
  }
  
  const allowedExtensions = (filters || [])
    .flatMap(filter => filter?.extensions || [])
    .filter(extension => extension && extension !== "*")
    .map(extension => extension.startsWith(".") ? extension : `.${extension}`);

  return fileAccessGuard.approveWritablePath(result.filePath, allowedExtensions) || null;
});

ipcMain.handle("open-external-url", async (_event, rawUrl) => {
  try {
    const safeUrl = String(rawUrl || "").trim();
    if (!safeUrl) {
      return { success: false, error: "URL eksik" };
    }

    const parsed = new URL(safeUrl);
    if (!["https:"].includes(parsed.protocol)) {
      return { success: false, error: "Yalnızca güvenli HTTPS adresleri açılabilir" };
    }

    await shell.openExternal(safeUrl);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error.message || "Harici adres açılamadı",
    };
  }
});

// Uygulama kapanırken klavye kısayollarını temizle
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

console.log("KankaAI Main Process started!");
