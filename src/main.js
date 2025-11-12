const path = require("path");

// Paketlenmiş uygulamada .env dosyasını doğru konumdan oku
const envPath = require("electron").app.isPackaged
  ? path.join(process.resourcesPath, ".env")
  : path.join(__dirname, "..", ".env");

require("dotenv").config({ path: envPath });

const { app, BrowserWindow, ipcMain, dialog, Menu, globalShortcut } = require("electron");
const fs = require("fs");
const XLSX = require("xlsx");
const JSZip = require("jszip");
const mammoth = require("mammoth");
const pdfParse = require("pdf-parse");
const { Document, Packer, Paragraph, TextRun, HeadingLevel } = require("docx");
const { summarize, askQuestion, analyzeImage, askImageQuestion, quickDescribeImage } = require("./utils/ai");

const SUPPORTED_EXTENSIONS = [
  ".pdf", ".docx", ".xlsx", ".xls", ".txt", ".md", ".csv", ".zip",
  ".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".udf"
];

let mainWindow;
let previewWindow = null;
let pendingFilePath = null;
let queuedFileToOpen = null;
let previewTransitioning = false;

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

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.once("ready-to-show", () => {
    if (show) {
      mainWindow.show();
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
    previewWindow?.webContents.send("preview-open-file", filePath);
  });
}

function sendFileToMainWindow(filePath) {
  if (!filePath) return;

  if (!mainWindow) {
    queuedFileToOpen = filePath;
    return;
  }

  if (mainWindow.webContents.isLoading()) {
    queuedFileToOpen = filePath;
  } else {
    mainWindow.webContents.send("open-file-path", filePath);
  }
}

function getSupportedFileFromArgs(args) {
  if (!args || !args.length) return null;
  return args.find(arg => SUPPORTED_EXTENSIONS.includes(path.extname(arg).toLowerCase()));
}

function handleFileOpen(filePath, { forcePreview = true } = {}) {
  if (!filePath || !fs.existsSync(filePath)) {
    return;
  }

  pendingFilePath = filePath;

  if (!mainWindow) {
    createWindow(forcePreview ? false : true);
  }

  if (!forcePreview) {
    sendFileToMainWindow(filePath);
    if (mainWindow && !mainWindow.isVisible()) {
      mainWindow.show();
    }
    return;
  }

  createPreviewWindow(filePath);
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
  
  // Ctrl+R ile sayfayı yenile
  globalShortcut.register('CommandOrControl+R', () => {
    if (mainWindow) {
      mainWindow.reload();
    }
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

  return result.filePaths[0];
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

  return result.filePaths;
});

ipcMain.handle("open-full-view", async (_event, filePath) => {
  const targetPath = filePath && fs.existsSync(filePath) ? filePath : pendingFilePath;
  if (!targetPath || !fs.existsSync(targetPath)) {
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
    if (!fs.existsSync(filePath)) {
      return { error: "Dosya bulunamadı" };
    }

    const buffer = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase().replace(".", "");
    const name = path.basename(filePath);

    const stats = fs.statSync(filePath);

    let result = { name, type: ext, size: stats.size, path: filePath };

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
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const sheetNames = workbook.SheetNames;
      const firstSheet = workbook.Sheets[sheetNames[0]];
      
      result.type = "xlsx";
      result.sheets = sheetNames;
      result.rows = firstSheet
        ? XLSX.utils.sheet_to_json(firstSheet, { header: 1 }).slice(0, 10)
        : [];
      
      // Excel'i metin olarak çevir (AI için - TÜM SAYFALAR - GELİŞMİŞ)
      let textContent = "";
      let sampleContent = ""; // Özet için her sayfadan örnek
      let totalRows = 0;
      
      sheetNames.forEach((sheetName, index) => {
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        totalRows += jsonData.length;
        
        // TÜM VERİ (fullText için) - SATIR NUMARALARI İLE
        textContent += `\n\n=== SAYFA ${index + 1}: ${sheetName} ===\n`;
        textContent += `Toplam Satır: ${jsonData.length}\n\n`;
        
        jsonData.forEach((row, rowIndex) => {
          // Satır numarası ekle (Excel gibi 1'den başlasın)
          const rowNum = rowIndex + 1;
          textContent += `[Satır ${rowNum}] ${row.join(" | ")}\n`;
        });
        
        // HER SAYFADAN ÖRNEK (sample için - özet için)
        sampleContent += `\n\n=== SAYFA ${index + 1}: ${sheetName} ===\n`;
        sampleContent += `Toplam Satır: ${jsonData.length}\n`;
        
        const sampleRows = jsonData.slice(0, 25); // Her sayfadan ilk 25 satır
        sampleRows.forEach((row, rowIndex) => {
          const rowNum = rowIndex + 1;
          sampleContent += `[Satır ${rowNum}] ${row.join(" | ")}\n`;
        });
        
        if (jsonData.length > 25) {
          sampleContent += `... (${jsonData.length - 25} satır daha var)\n`;
        }
      });
      
      result.fullText = textContent;
      result.sample = sampleContent;
      result.totalSheets = sheetNames.length;
      result.totalRows = totalRows;
    }
    // ZIP dosyası
    else if (ext === "zip") {
      const zip = await JSZip.loadAsync(buffer);
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

    const summary = await summarize(text);
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

    const answer = await askQuestion(text, question);
    return { success: true, answer };
  } catch (error) {
    console.error("AI soru-cevap hatası:", error);
    return { 
      success: false, 
      error: error.message || "Soru cevaplanamadı" 
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
    const description = await analyzeImage(buffer, mimeType);
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

    const description = await quickDescribeImage(base64Data, mimeType);
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
    const answer = await askImageQuestion(buffer, mimeType, question);
    return { success: true, answer };
  } catch (error) {
    console.error("AI resim soru-cevap hatası:", error);
    return { 
      success: false, 
      error: error.message || "Soru cevaplanamadı" 
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
    fs.writeFileSync(filePath, buffer);
    
    return { success: true, message: "Word dosyası kaydedildi!" };
  } catch (error) {
    console.error("Word kaydetme hatası:", error);
    return { success: false, error: error.message };
  }
});

// Excel dosyası kaydetme
ipcMain.handle("save-excel", async (_event, filePath, data) => {
  try {
    // data = { sheetName, rows: [[...], [...], ...] }
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(data.rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, data.sheetName || "Sheet1");
    XLSX.writeFile(workbook, filePath);
    
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
  
  return result.filePath;
});

// Uygulama kapanırken klavye kısayollarını temizle
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

console.log("✅ KankaAI Main Process başlatıldı!");
