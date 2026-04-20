const { contextBridge, ipcRenderer, webUtils } = require("electron");

// Renderer process için güvenli API'yi dışa aktar
contextBridge.exposeInMainWorld("kankaAPI", {
  // Dosya seçme
  pickFile: () => ipcRenderer.invoke("pick-file"),
  
  // Çoklu dosya seçme
  pickMultipleFiles: () => ipcRenderer.invoke("pick-multiple-files"),
  
  // Dosya içeriğini okuma
  peekFile: (filePath) => ipcRenderer.invoke("peek-file", filePath),
  authorizeRecentFile: (filePath) => ipcRenderer.invoke("authorize-recent-file", filePath),
  getDroppedFilePath: (file) => {
    try {
      const filePath = webUtils.getPathForFile(file);
      return ipcRenderer.invoke("authorize-dropped-file-path", filePath);
    } catch (_error) {
      return null;
    }
  },
  
  // AI özetleme
  aiSummary: (text) => ipcRenderer.invoke("ai-summary", text),
  
  // AI soru-cevap
  aiQuestion: (text, question) => ipcRenderer.invoke("ai-question", text, question),
  aiTranscribeAudio: (base64Audio, mimeType) => ipcRenderer.invoke("ai-transcribe-audio", base64Audio, mimeType),
  getLocalSTTStatus: () => ipcRenderer.invoke("local-stt-status"),
  installLocalSTT: () => ipcRenderer.invoke("local-stt-install"),
  
  // AI resim analizi
  aiAnalyzeImage: (base64Data, mimeType) => ipcRenderer.invoke("ai-analyze-image", base64Data, mimeType),
  aiAnalyzeImageQuick: (base64Data, mimeType) => ipcRenderer.invoke("ai-analyze-image-quick", base64Data, mimeType),
  
  // AI resim soru-cevap
  aiImageQuestion: (base64Data, mimeType, question) => ipcRenderer.invoke("ai-image-question", base64Data, mimeType, question),

  // AI sağlayıcı ayarları
  getAISettings: () => ipcRenderer.invoke("ai-settings-get"),
  saveAISettings: (payload) => ipcRenderer.invoke("ai-settings-save", payload),
  listAIModels: (providerId, overrides) => ipcRenderer.invoke("ai-models-list", providerId, overrides),
  testAIProvider: (providerId, overrides) => ipcRenderer.invoke("ai-provider-test", providerId, overrides),
  pullOllamaModel: (payload) => ipcRenderer.invoke("ollama-pull-model", payload),
  
  // Dosya yolu dinleyici (sağ tıkla aç için)
  onOpenFile: (callback) => {
    ipcRenderer.on("open-file-path", (_event, filePath) => {
      callback(filePath);
    });
  },
  
  // Önizleme penceresi için dosya bilgisi
  onPreviewFile: (callback) => {
    ipcRenderer.on("preview-open-file", (_event, filePath) => {
      callback(filePath);
    });
  },

  // Tam arayüze geçiş
  openFullView: (filePath) => ipcRenderer.invoke("open-full-view", filePath),
  
  // Word dosyası kaydetme
  saveWord: (filePath, htmlContent) => ipcRenderer.invoke("save-word", filePath, htmlContent),
  
  // Excel dosyası kaydetme
  saveExcel: (filePath, data) => ipcRenderer.invoke("save-excel", filePath, data),
  
  // Farklı kaydet dialogu
  showSaveDialog: (defaultPath, filters) => ipcRenderer.invoke("save-file-dialog", defaultPath, filters),
  openExternalUrl: (url) => ipcRenderer.invoke("open-external-url", url)
});
