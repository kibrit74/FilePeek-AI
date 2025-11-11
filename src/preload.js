const { contextBridge, ipcRenderer } = require("electron");

// Renderer process için güvenli API'yi dışa aktar
contextBridge.exposeInMainWorld("kankaAPI", {
  // Dosya seçme
  pickFile: () => ipcRenderer.invoke("pick-file"),
  
  // Çoklu dosya seçme
  pickMultipleFiles: () => ipcRenderer.invoke("pick-multiple-files"),
  
  // Dosya içeriğini okuma
  peekFile: (filePath) => ipcRenderer.invoke("peek-file", filePath),
  
  // AI özetleme
  aiSummary: (text) => ipcRenderer.invoke("ai-summary", text),
  
  // AI soru-cevap
  aiQuestion: (text, question) => ipcRenderer.invoke("ai-question", text, question),
  
  // AI resim analizi
  aiAnalyzeImage: (base64Data, mimeType) => ipcRenderer.invoke("ai-analyze-image", base64Data, mimeType),
  
  // AI resim soru-cevap
  aiImageQuestion: (base64Data, mimeType, question) => ipcRenderer.invoke("ai-image-question", base64Data, mimeType, question),
  
  // Dosya yolu dinleyici (sağ tıkla aç için)
  onOpenFile: (callback) => {
    ipcRenderer.on("open-file-path", (_event, filePath) => {
      callback(filePath);
    });
  },
  
  // Word dosyası kaydetme
  saveWord: (filePath, htmlContent) => ipcRenderer.invoke("save-word", filePath, htmlContent),
  
  // Excel dosyası kaydetme
  saveExcel: (filePath, data) => ipcRenderer.invoke("save-excel", filePath, data),
  
  // Farklı kaydet dialogu
  showSaveDialog: (defaultPath, filters) => ipcRenderer.invoke("save-file-dialog", defaultPath, filters)
});
