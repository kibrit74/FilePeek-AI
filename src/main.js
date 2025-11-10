require("dotenv").config();

const { app, BrowserWindow, ipcMain, dialog, Menu, globalShortcut } = require("electron");
const path = require("path");
const fs = require("fs");
const XLSX = require("xlsx");
const JSZip = require("jszip");
const mammoth = require("mammoth");
const pdfParse = require("pdf-parse");
const { summarize, askQuestion, analyzeImage, askImageQuestion } = require("./utils/ai");

let mainWindow;

// Ana pencereyi oluştur
function createWindow() {
  // Menüyü tamamen kaldır
  Menu.setApplicationMenu(null);
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, "../build/icon.png"),
  });

  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));
  
  // Geliştirme modunda DevTools'u aç
  if (process.env.NODE_ENV === "development") {
    mainWindow.webContents.openDevTools();
  }
}

// Uygulama hazır olunca pencereyi aç
app.whenReady().then(() => {
  createWindow();
  
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
      createWindow();
    }
  });

  // Komut satırından dosya açma desteği (sağ tık entegrasyonu için)
  const fileArg = process.argv.find(arg => 
    arg.endsWith('.pdf') || arg.endsWith('.docx') || 
    arg.endsWith('.xlsx') || arg.endsWith('.txt') || 
    arg.endsWith('.zip') || arg.endsWith('.jpg') || 
    arg.endsWith('.jpeg') || arg.endsWith('.png') || 
    arg.endsWith('.gif') || arg.endsWith('.webp') || 
    arg.endsWith('.bmp') || arg.endsWith('.udf')
  );
  
  if (fileArg && fs.existsSync(fileArg)) {
    setTimeout(() => {
      mainWindow.webContents.send('open-file-path', fileArg);
    }, 1000);
  }
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

// Dosya içeriğini okuma
ipcMain.handle("peek-file", async (_event, filePath) => {
  try {
    if (!fs.existsSync(filePath)) {
      return { error: "Dosya bulunamadı" };
    }

    const buffer = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase().replace(".", "");
    const name = path.basename(filePath);

    let result = { name, type: ext };

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
      
      // Excel'i metin olarak çevir (AI için)
      let textContent = "";
      sheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        textContent += `Sayfa: ${sheetName}\n`;
        jsonData.forEach(row => {
          textContent += row.join(" | ") + "\n";
        });
      });
      result.fullText = textContent;
      result.sample = textContent.slice(0, 1500);
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
    // Yeni bir dosya açılmaya çalışıldıysa
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();

      const fileArg = commandLine.find(arg => 
        arg.endsWith('.pdf') || arg.endsWith('.docx') || 
        arg.endsWith('.xlsx') || arg.endsWith('.txt') || 
        arg.endsWith('.zip') || arg.endsWith('.jpg') || 
        arg.endsWith('.jpeg') || arg.endsWith('.png') || 
        arg.endsWith('.gif') || arg.endsWith('.webp') || 
        arg.endsWith('.bmp') || arg.endsWith('.udf')
      );
      
      if (fileArg && fs.existsSync(fileArg)) {
        mainWindow.webContents.send('open-file-path', fileArg);
      }
    }
  });
}

// Uygulama kapanırken klavye kısayollarını temizle
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

console.log("✅ KankaAI Main Process başlatıldı!");
