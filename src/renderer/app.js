// PDF.js Kütüphanesi
let pdfjsLib;
const pdfjsLibReady = (async () => {
  const module = await import('../../node_modules/pdfjs-dist/build/pdf.mjs');
  module.GlobalWorkerOptions.workerSrc = '../../node_modules/pdfjs-dist/build/pdf.worker.mjs';
  pdfjsLib = module;
  return module;
})();

// PDF ilk sayfayı render et
async function renderPDFFirstPage(pdfBase64) {
  try {
    if (!pdfjsLib) {
      await pdfjsLibReady;
    }
    
    const pdfData = atob(pdfBase64);
    const pdfArray = new Uint8Array(pdfData.length);
    for (let i = 0; i < pdfData.length; i++) {
      pdfArray[i] = pdfData.charCodeAt(i);
    }
    
    const loadingTask = pdfjsLib.getDocument({ data: pdfArray });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);
    
    const scale = 1.5;
    const viewport = page.getViewport({ scale });
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise;
    
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('PDF render hatası:', error);
    return null;
  }
}

// DOM elemanları
const pickFileBtn = document.getElementById("pickFileBtn");
const dropZone = document.getElementById("dropZone");
const fileInfo = document.getElementById("fileInfo");
const fileName = document.getElementById("fileName");
const fileType = document.getElementById("fileType");
const preview = document.getElementById("preview");
const summaryBtn = document.getElementById("summaryBtn");
const askBtn = document.getElementById("askBtn");
const questionInput = document.getElementById("questionInput");
const aiResult = document.getElementById("aiResult");
const loading = document.getElementById("loading");
const loadingText = document.getElementById("loadingText");
const emptyState = document.querySelector(".empty-state");
const themeToggle = document.getElementById("themeToggle");
const historyList = document.getElementById("historyList");
const translateBtn = document.getElementById("translateBtn");
const speakBtn = document.getElementById("speakBtn");
const exportBtn = document.getElementById("exportBtn");
const resultTitle = document.getElementById("resultTitle");
const resultContent = document.getElementById("resultContent");
const settingsBtn = document.getElementById("settingsBtn");
const settingsModal = document.getElementById("settingsModal");
const closeSettings = document.getElementById("closeSettings");
const colorThemes = document.querySelectorAll(".color-theme");
const langSelect = document.getElementById("langSelect");
const batchBtn = document.getElementById("batchBtn");
const translateModal = document.getElementById("translateModal");
const closeTranslate = document.getElementById("closeTranslate");
const translateLangSelect = document.getElementById("translateLangSelect");
const confirmTranslate = document.getElementById("confirmTranslate");
const langToggle = document.getElementById("langToggle");
const langText = document.getElementById("langText");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");
const lightThemeBtn = document.getElementById("lightThemeBtn");
const darkThemeBtn = document.getElementById("darkThemeBtn");
const reloadFileBtn = document.getElementById("reloadFileBtn");

// Çeviri metinleri
const translations = {
  tr: {
    pickFile: "Dosya Aç",
    batchProcess: "Toplu İşlem",
    subtitle: "İçini gör, anında",
    dragDrop: "Dosyayı buraya sürükle bırak",
    or: "veya",
    selectFile: "Dosya Seç",
    loading: "Yükleniyor...",
    summary: "Özetle",
    ask: "Sor",
    askQuestion: "Soru sor...",
    noFile: "Henüz dosya seçilmedi",
    recentFiles: "Son Dosyalar",
    settings: "Ayarlar",
    appearance: "Görünüm",
    themeMode: "Tema Modu",
    light: "Açık",
    dark: "Koyu",
    colorTheme: "Renk Teması",
    language: "Dil",
    general: "Genel",
    fileHistory: "Dosya Geçmişi",
    clearHistory: "Geçmişi Temizle",
    about: "Hakkında",
    version: "v1.0.0",
    description: "AI destekli dosya önizleme ve analiz aracı",
    copyright: "© 2024 FilePeek AI Team"
  },
  en: {
    pickFile: "Open File",
    batchProcess: "Batch Process",
    subtitle: "See inside, instantly",
    dragDrop: "Drag and drop file here",
    or: "or",
    selectFile: "Select File",
    loading: "Loading...",
    summary: "Summarize",
    ask: "Ask",
    askQuestion: "Ask a question...",
    noFile: "No file selected yet",
    recentFiles: "Recent Files",
    settings: "Settings",
    appearance: "Appearance",
    themeMode: "Theme Mode",
    light: "Light",
    dark: "Dark",
    colorTheme: "Color Theme",
    language: "Language",
    general: "General",
    fileHistory: "File History",
    clearHistory: "Clear History",
    about: "About",
    version: "v1.0.0",
    description: "AI-powered file preview and analysis tool",
    copyright: "© 2024 FilePeek AI Team"
  }
};

// Aktif dosya verisi
let currentFileData = null;
let lastAIResult = null;
let currentLang = localStorage.getItem("appLang") || "tr";

// Tema yönetimi
const savedTheme = localStorage.getItem("theme") || "light";
document.documentElement.setAttribute("data-theme", savedTheme);

// Tema değiştirme fonksiyonu
function updateTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
  
  // Aktif butonu göster
  lightThemeBtn.classList.toggle("active", theme === "light");
  darkThemeBtn.classList.toggle("active", theme === "dark");
}

// Tema butonları (ayarlar modalında)
lightThemeBtn.addEventListener("click", () => updateTheme("light"));
darkThemeBtn.addEventListener("click", () => updateTheme("dark"));

// İlk yüklemede aktif temayı göster
updateTheme(savedTheme);

// Dosya geçmişi yönetimi
function getFileHistory() {
  const history = localStorage.getItem("fileHistory");
  return history ? JSON.parse(history) : [];
}

function addToHistory(filePath, fileName, fileType, fileSize) {
  let history = getFileHistory();
  history = history.filter(item => item.path !== filePath);
  history.unshift({ path: filePath, name: fileName, type: fileType, date: Date.now(), size: fileSize });
  history = history.slice(0, 10);
  localStorage.setItem("fileHistory", JSON.stringify(history));
  updateHistoryUI();
}

function updateHistoryUI() {
  const history = getFileHistory();
  historyList.innerHTML = "";
  
  if (history.length === 0) {
    historyList.innerHTML = '<li class="history-empty"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg><p>Henüz dosya açılmadı</p></li>';
    return;
  }
  
  history.forEach((item, index) => {
    const li = document.createElement("li");
    li.className = "history-item";
    
    // Zaman formatı (örn: "2 saat önce", "Dün", "3 gün önce")
    const timeAgo = formatTimeAgo(item.date);
    
    // Dosya boyutu formatı (örn: "1.2 MB", "345 KB")
    const fileSize = item.size ? formatFileSize(item.size) : "";
    
    li.innerHTML = `
      <div class="history-item-icon" data-type="${item.type}">${getFileIcon(item.type)}</div>
      <div class="history-item-content">
        <div class="history-item-name">${escapeHtml(item.name)}</div>
        <div class="history-item-meta">
          ${fileSize ? `<span class="history-size">${fileSize}</span>` : ''}
          <span class="history-time">${timeAgo}</span>
        </div>
      </div>
      <button class="history-item-delete" onclick="event.stopPropagation(); removeFromHistory(${index});" title="Geçmişten Sil">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      </button>
    `;
    
    li.addEventListener("click", () => loadFile(item.path));
    historyList.appendChild(li);
  });
}

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return "";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function formatTimeAgo(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return "Az önce";
  if (minutes < 60) return minutes + " dk önce";
  if (hours < 24) return hours + " saat önce";
  if (days === 1) return "Dün";
  if (days < 7) return days + " gün önce";
  return new Date(timestamp).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

function removeFromHistory(index) {
  let history = getFileHistory();
  history.splice(index, 1);
  localStorage.setItem("fileHistory", JSON.stringify(history));
  updateHistoryUI();
}

// Global erişim için
window.removeFromHistory = removeFromHistory;

function getFileIcon(type) {
  const icons = {
    pdf: "📕",
    docx: "📘",
    xlsx: "📊",
    zip: "🗜️",
    text: "📝",
    txt: "📝",
    image: "🖼️",
    udf: "⚖️"
  };
  return icons[type] || "📄";
}

updateHistoryUI();

// Dosya seçme butonu
pickFileBtn.addEventListener("click", async () => {
  const filePath = await window.kankaAPI.pickFile();
  if (filePath) {
    await loadFile(filePath, false); // Manuel seçimde otomatik analiz yok
  }
});

// Drop zone'a tıklama - dosya seçme dialogu aç
dropZone.addEventListener("click", () => {
  pickFileBtn.click();
});

// Sürükle-bırak
dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("drag-over");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("drag-over");
});

dropZone.addEventListener("drop", async (e) => {
  e.preventDefault();
  dropZone.classList.remove("drag-over");
  
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    await loadFile(files[0].path);
  }
});

// Sağ tıkla açma - Resimse otomatik analiz
window.kankaAPI.onOpenFile(async (filePath) => {
  await loadFile(filePath);
  
  // Eğer resim dosyasıysa otomatik analiz başlat
  if (currentFileData && currentFileData.type === "image") {
    // 1 saniye bekle ki kullanıcı önizlemeyi görsün
    setTimeout(() => {
      summaryBtn.click(); // Otomatik "Betimle" butonuna tıkla
    }, 1000);
  }
});

// Dosya yükleme fonksiyonu
async function loadFile(filePath, autoAnalyze = false) {
  showLoading("Dosya okunuyor...");
  
  try {
    const data = await window.kankaAPI.peekFile(filePath);
    
    if (data.error) {
      showError(data.error);
      return;
    }
    
    currentFileData = data;
    currentFileData.fullPath = filePath;
    displayFile(data);
    hideLoading();
    
    // Resimse ve autoAnalyze aktifse otomatik analiz başlat
    if (autoAnalyze && data.type === "image") {
      setTimeout(() => {
        summaryBtn.click();
      }, 500);
    }
    
  } catch (error) {
    showError(`Hata: ${error.message}`);
  }
}

// Dosya görüntüleme
function displayFile(data, keepAIResult = false) {
  fileName.textContent = data.name;
  fileType.textContent = data.type.toUpperCase();
  
  fileInfo.classList.remove("hidden");
  emptyState.classList.add("hidden");
  
  // Toplu işlemde AI sonuçlarını gizleme
  if (!keepAIResult) {
    aiResult.classList.add("hidden");
  }
  
  // Geçmişe ekle (dosya yolu bilgisi varsa)
  if (data.fullPath) {
    addToHistory(data.fullPath, data.name, data.type, data.size);
  }
  
  let previewHtml = "";
  
  switch (data.type) {
    case "pdf":
      const pdfSizeMB = data.size ? (data.size / 1024 / 1024).toFixed(2) : "?";
      previewHtml = `
        <div class="file-preview-card">
          <div class="preview-header">
            <div class="preview-icon pdf-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" fill="#DC2626" stroke="#DC2626" stroke-width="1.5"/>
                <path d="M14 2V8H20" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
                <text x="12" y="16" font-family="Arial, sans-serif" font-size="5" font-weight="bold" fill="white" text-anchor="middle">PDF</text>
              </svg>
            </div>
            <div class="preview-meta">
              <h3>PDF Belgesi</h3>
              <div class="preview-stats">
                <span class="stat-badge"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg> ${data.pages} Sayfa</span>
                <span class="stat-badge"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg> ${pdfSizeMB} MB</span>
              </div>
            </div>
          </div>
          <div class="preview-content">
            <h4 style="margin: 0 0 12px 0; font-size: 13px; font-weight: 600; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <line x1="10" y1="9" x2="8" y2="9"></line>
              </svg>
              İlk Sayfa Önizlemesi
            </h4>
            <div id="pdf-preview-loading" style="text-align: center; padding: 40px; color: var(--text-secondary);">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;">
                <circle cx="12" cy="12" r="10" opacity="0.25"></circle>
                <path d="M12 2a10 10 0 0 1 10 10" opacity="0.75"></path>
              </svg>
              <p style="margin-top: 16px;">PDF yükleniyor...</p>
            </div>
            <div id="pdf-preview-container" style="text-align: center; display: none;"></div>
            <details style="margin-top: 20px;">
              <summary style="cursor: pointer; font-weight: 500; padding: 8px; background: var(--bg-secondary); border-radius: 6px;">📄 Metin İçeriği</summary>
              <div class="content-text" style="margin-top: 12px;">${escapeHtml(data.sample)}</div>
            </details>
          </div>
        </div>`;
      
      // PDF render et
      if (data.pdfData) {
        setTimeout(async () => {
          const pdfImageUrl = await renderPDFFirstPage(data.pdfData);
          const loadingEl = document.getElementById('pdf-preview-loading');
          const containerEl = document.getElementById('pdf-preview-container');
          
          if (loadingEl && containerEl) {
            loadingEl.style.display = 'none';
            
            if (pdfImageUrl) {
              containerEl.innerHTML = `<img src="${pdfImageUrl}" style="max-width: 100%; border: 1px solid var(--border); border-radius: var(--radius-md); box-shadow: 0 4px 20px rgba(0,0,0,0.1);" alt="PDF İlk Sayfa">`;
              containerEl.style.display = 'block';
            } else {
              containerEl.innerHTML = `<p style="color: var(--text-secondary); padding: 20px;">PDF önizleme oluşturulamadı</p>`;
              containerEl.style.display = 'block';
            }
          }
        }, 100);
      }
      break;
      
    case "docx":
      const docxSizeMB = data.size ? (data.size / 1024 / 1024).toFixed(2) : "?";
      previewHtml = `
        <div class="file-preview-card">
          <div class="preview-header">
            <div class="preview-icon word-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" fill="#2B579A" stroke="#2B579A" stroke-width="1.5"/>
                <path d="M14 2V8H20" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
                <text x="12" y="16" font-family="Arial, sans-serif" font-size="4.5" font-weight="bold" fill="white" text-anchor="middle">W</text>
              </svg>
            </div>
            <div class="preview-meta">
              <h3>Word Belgesi</h3>
              <div class="preview-stats">
                <span class="stat-badge"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg> ${docxSizeMB} MB</span>
              </div>
            </div>
          </div>
          <div class="preview-content">
            <h4 style="margin: 0 0 12px 0; font-size: 13px; font-weight: 600; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <line x1="10" y1="9" x2="8" y2="9"></line>
              </svg>
              Belge İçeriği
            </h4>
            <div class="content-text">${escapeHtml(data.sample)}</div>
          </div>
        </div>`;
      break;
      
    case "xlsx":
      const xlsxSizeMB = data.size ? (data.size / 1024 / 1024).toFixed(2) : "?";
      let tableHtml = "";
      if (data.rows && data.rows.length > 0) {
        tableHtml += "<table>";
        data.rows.forEach((row, idx) => {
          const tag = idx === 0 ? "th" : "td";
          tableHtml += "<tr>";
          row.forEach(cell => {
            tableHtml += `<${tag}>${escapeHtml(String(cell || ""))}</${tag}>`;
          });
          tableHtml += "</tr>";
        });
        tableHtml += "</table>";
      }
      
      previewHtml = `
        <div class="file-preview-card">
          <div class="preview-header" style="background: linear-gradient(135deg, rgba(34, 197, 94, 0.05) 0%, rgba(22, 163, 74, 0.05) 100%);">
            <div class="preview-icon excel-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" fill="#107C41" stroke="#107C41" stroke-width="1.5"/>
                <path d="M14 2V8H20" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
                <text x="12" y="16" font-family="Arial, sans-serif" font-size="4.5" font-weight="bold" fill="white" text-anchor="middle">X</text>
              </svg>
            </div>
            <div class="preview-meta">
              <h3>Excel Tablosu</h3>
              <div class="preview-stats">
                <span class="stat-badge"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg> ${data.sheets.join(", ")}</span>
                <span class="stat-badge"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg> ${xlsxSizeMB} MB</span>
              </div>
            </div>
          </div>
          <div class="preview-content">
            ${tableHtml}
          </div>
        </div>`;
      break;
      
    case "zip":
      previewHtml = `<strong>ZIP Arşivi</strong><br>
Toplam ${data.totalFiles} dosya<br><br>
<ul class="zip-list">`;
      data.entries.slice(0, 50).forEach(entry => {
        const icon = entry.isFolder ? "📁" : "📄";
        previewHtml += `<li>${icon} ${escapeHtml(entry.name)}</li>`;
      });
      previewHtml += "</ul>";
      if (data.totalFiles > 50) {
        previewHtml += `<p>... ve ${data.totalFiles - 50} dosya daha</p>`;
      }
      break;
      
    case "text":
      const txtSizeMB = data.size ? (data.size / 1024 / 1024).toFixed(2) : "?";
      previewHtml = `
        <div class="file-preview-card">
          <div class="preview-header">
            <div class="preview-icon txt-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" fill="#64748B" stroke="#64748B" stroke-width="1.5"/>
                <path d="M14 2V8H20" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
                <g transform="translate(12, 15)">
                  <line x1="-2.5" y1="-2" x2="2.5" y2="-2" stroke="white" stroke-width="0.7"/>
                  <line x1="-2.5" y1="0" x2="2.5" y2="0" stroke="white" stroke-width="0.7"/>
                  <line x1="-2.5" y1="2" x2="1.5" y2="2" stroke="white" stroke-width="0.7"/>
                </g>
              </svg>
            </div>
            <div class="preview-meta">
              <h3>Metin Dosyası</h3>
              <div class="preview-stats">
                <span class="stat-badge"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg> ${txtSizeMB} MB</span>
              </div>
            </div>
          </div>
          <div class="preview-content">
            <h4 style="margin: 0 0 12px 0; font-size: 13px; font-weight: 600; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <line x1="10" y1="9" x2="8" y2="9"></line>
              </svg>
              Metin İçeriği
            </h4>
            <div class="content-text">${escapeHtml(data.sample)}</div>
          </div>
        </div>`;
      break;
      
    case "udf":
      const udfSizeMB = data.size ? (data.size / 1024 / 1024).toFixed(2) : "?";
      previewHtml = `
        <div class="file-preview-card">
          <div class="preview-header" style="background: linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, rgba(124, 58, 237, 0.05) 100%);">
            <div class="preview-icon udf-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" fill="#8B5CF6"/>
                <text x="12" y="17" font-family="Arial, sans-serif" font-size="9" font-weight="bold" fill="white" text-anchor="middle">UDF</text>
              </svg>
            </div>
            <div class="preview-meta">
              <h3>UDF Dosyası (Hukuk Belgesi)</h3>
              <div class="preview-stats">
                <span class="stat-badge"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg> ${udfSizeMB} MB</span>
              </div>
            </div>
          </div>
          <div class="preview-content">
            <h4 style="margin: 0 0 12px 0; font-size: 13px; font-weight: 600; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <line x1="10" y1="9" x2="8" y2="9"></line>
              </svg>
              Belge İçeriği
            </h4>
            <div class="content-text" style="border-left: 3px solid #8B5CF6; font-family: 'Courier New', monospace;">${escapeHtml(data.sample)}</div>
          </div>
        </div>`;
      break;
      
    case "image":
      const imgSizeMB = (data.size / 1024 / 1024).toFixed(2);
      previewHtml = `
        <div class="file-preview-card">
          <div class="preview-header" style="background: linear-gradient(135deg, rgba(168, 85, 247, 0.05) 0%, rgba(147, 51, 234, 0.05) 100%);">
            <div class="preview-icon image-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" fill="#A855F7" stroke="#A855F7" stroke-width="1.5"/>
                <path d="M14 2V8H20" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
                <g transform="translate(12, 14)">
                  <circle cx="0" cy="-2" r="1.2" fill="white"/>
                  <path d="M-3.5 2 L-1 -0.5 L1 1.5 L3.5 -1" stroke="white" stroke-width="0.8" fill="none" stroke-linecap="round"/>
                </g>
              </svg>
            </div>
            <div class="preview-meta">
              <h3>Resim Dosyası</h3>
              <div class="preview-stats">
                <span class="stat-badge"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg> ${imgSizeMB} MB</span>
              </div>
            </div>
          </div>
          <div class="preview-content">
            <div style="text-align: center;">
              <img src="${data.imageData}" style="max-width: 100%; max-height: 500px; border-radius: var(--radius-md); box-shadow: 0 4px 20px rgba(0,0,0,0.15);" alt="Önizleme">
            </div>
          </div>
        </div>`;
      break;
  }
  
  preview.innerHTML = previewHtml;
  
  // Resim ise "Özetle" butonunu "Betimle" yap
  if (data.type === "image") {
    summaryBtn.textContent = "🖼️ Betimle";
  } else {
    summaryBtn.textContent = "✨ Özetle";
  }
}

// AI Özetleme/Betimleme butonu
summaryBtn.addEventListener("click", async () => {
  if (!currentFileData) return;
  
  // Resim ise betimle
  if (currentFileData.type === "image") {
    showLoading("AI resmi analiz ediyor...");
    aiResult.classList.add("hidden");
    
    try {
      const result = await window.kankaAPI.aiAnalyzeImage(currentFileData.base64, currentFileData.mimeType);
      
      if (result.success) {
        showAIResult("🖼️ Resim Betimleme", result.description);
      } else {
        showError(result.error);
      }
    } catch (error) {
      showError(`Resim analizi hatası: ${error.message}`);
    } finally {
      hideLoading();
    }
  } 
  // Metin/belge ise özetle
  else {
    showLoading("AI ile özetleniyor...");
    aiResult.classList.add("hidden");
    
    try {
      const text = currentFileData.fullText || currentFileData.sample || "";
      if (!text || text.trim().length === 0) {
        showError("Özetlenecek metin bulunamadı!");
        hideLoading();
        return;
      }
      const result = await window.kankaAPI.aiSummary(text);
      
      if (result.success) {
        showAIResult("📝 Özet", result.summary);
      } else {
        showError(result.error);
      }
    } catch (error) {
      showError(`Özet hatası: ${error.message}`);
    } finally {
      hideLoading();
    }
  }
});

// Soru sorma butonu
askBtn.addEventListener("click", async () => {
  const question = questionInput.value.trim();
  if (!question || !currentFileData) return;
  
  showLoading("AI cevap hazırlıyor...");
  aiResult.classList.add("hidden");
  
  try {
    // Resim ise resim soru-cevap
    if (currentFileData.type === "image") {
      const result = await window.kankaAPI.aiImageQuestion(currentFileData.base64, currentFileData.mimeType, question);
      
      if (result.success) {
        showAIResult(`💬 Soru: "${question}"`, result.answer);
        questionInput.value = "";
      } else {
        showError(result.error);
      }
    } 
    // Metin/belge ise normal soru-cevap
    else {
      const text = currentFileData.fullText || currentFileData.sample || "";
      if (!text || text.trim().length === 0) {
        showError("Soru sorulacak metin bulunamadı!");
        hideLoading();
        return;
      }
      const result = await window.kankaAPI.aiQuestion(text, question);
      
      if (result.success) {
        showAIResult(`💬 Soru: "${question}"`, result.answer);
        questionInput.value = "";
      } else {
        showError(result.error);
      }
    }
  } catch (error) {
    showError(`Soru hatası: ${error.message}`);
  } finally {
    hideLoading();
  }
});

// Enter tuşu ile soru gönderme
questionInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    askBtn.click();
  }
});

// Yardımcı fonksiyonlar
function showLoading(text) {
  loadingText.textContent = text;
  loading.classList.remove("hidden");
}

function hideLoading() {
  loading.classList.add("hidden");
}

function showAIResult(title, content) {
  console.log("showAIResult çağrıldı:", { title, contentLength: content?.length });
  lastAIResult = { title, content };
  
  // Başlık ve içeriği ayarla
  resultTitle.textContent = title;
  resultTitle.style.color = ""; // Rengi sıfırla (hata durumundan kalmış olabilir)
  resultContent.innerHTML = escapeHtml(content).replace(/\n/g, "<br>");
  
  // Hidden class'ını kaldır ve görünür yap
  aiResult.classList.remove("hidden");
  aiResult.style.display = "block";
  aiResult.style.visibility = "visible";
  aiResult.style.opacity = "1";
  aiResult.style.height = "auto";
  
  // Parent elementlerin de görünür olduğundan emin ol
  let parent = aiResult.parentElement;
  while (parent) {
    parent.classList.remove("hidden");
    if (parent.style) {
      parent.style.display = "";
    }
    parent = parent.parentElement;
    if (parent === document.body) break;
  }
  
  // Sonuç paneline scroll yap
  setTimeout(() => {
    aiResult.scrollIntoView({ behavior: "smooth", block: "center" });
    console.log("Scroll tamamlandı. Panel pozisyonu:", aiResult.getBoundingClientRect());
  }, 200);
  
  console.log("AI sonuç paneli gösterildi ve scroll yapıldı", {
    hasHiddenClass: aiResult.classList.contains("hidden"),
    displayStyle: aiResult.style.display,
    titleText: resultTitle.textContent,
    contentPreview: resultContent.innerHTML.substring(0, 100)
  });
}

function showError(message) {
  lastAIResult = null;
  resultTitle.textContent = "Hata";
  resultTitle.style.color = "var(--danger)";
  resultContent.textContent = message;
  aiResult.classList.remove("hidden");
  hideLoading();
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Çeviri butonu
translateBtn.addEventListener("click", () => {
  if (!currentFileData) return;
  translateModal.classList.remove("hidden");
});

closeTranslate.addEventListener("click", () => {
  translateModal.classList.add("hidden");
});

translateModal.addEventListener("click", (e) => {
  if (e.target === translateModal) {
    translateModal.classList.add("hidden");
  }
});

confirmTranslate.addEventListener("click", async () => {
  const targetLang = translateLangSelect.value;
  translateModal.classList.add("hidden");
  
  showLoading(`${targetLang} diline çevriliyor...`);
  aiResult.classList.add("hidden");
  
  try {
    const text = currentFileData.fullText || currentFileData.sample;
    const result = await window.kankaAPI.aiQuestion(
      text,
      `Bu metni ${targetLang} diline çevir. Sadece çeviriyi yaz, başka açıklama ekleme.`
    );
    
    if (result.success) {
      showAIResult(`${targetLang} Çeviri`, result.answer);
    } else {
      showError(result.error);
    }
  } catch (error) {
    showError(`Çeviri hatası: ${error.message}`);
  } finally {
    hideLoading();
  }
});

// Sesli okuma butonu
let speechSynthesis = window.speechSynthesis;
let currentUtterance = null;

speakBtn.addEventListener("click", () => {
  // AI sonucu varsa onu oku, yoksa dosya içeriğini oku
  const textSource = lastAIResult ? lastAIResult.content : (currentFileData ? (currentFileData.fullText || currentFileData.sample) : null);
  
  // Eğer konuşma devam ediyorsa durdur
  if (speechSynthesis.speaking) {
    speechSynthesis.cancel();
    speakBtn.innerHTML = '<span class="ai-icon">🔊</span> Oku';
    return;
  }
  
  if (!textSource || textSource.length === 0) {
    alert("Okunacak metin bulunamadı!");
    return;
  }
  const textToSpeak = textSource.slice(0, 5000); // İlk 5000 karakter
  
  currentUtterance = new SpeechSynthesisUtterance(textToSpeak);
  currentUtterance.lang = 'tr-TR';
  currentUtterance.rate = 1.0;
  currentUtterance.pitch = 1.0;
  
  currentUtterance.onstart = () => {
    speakBtn.innerHTML = '<span class="ai-icon">⏸</span> Durdur';
  };
  
  currentUtterance.onend = () => {
    speakBtn.innerHTML = '<span class="ai-icon">🔊</span> Oku';
  };
  
  speechSynthesis.speak(currentUtterance);
});

// Dışa aktarma butonu
exportBtn.addEventListener("click", () => {
  if (!lastAIResult) return;
  
  const content = `${lastAIResult.title}\n${'='.repeat(50)}\n\n${lastAIResult.content}\n\n---\nKankaAI ile oluşturuldu\n${new Date().toLocaleString('tr-TR')}`;
  
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `kankaai-${Date.now()}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

// Ayarlar paneli
settingsBtn.addEventListener("click", () => {
  settingsModal.classList.remove("hidden");
});

closeSettings.addEventListener("click", () => {
  settingsModal.classList.add("hidden");
});

settingsModal.addEventListener("click", (e) => {
  if (e.target === settingsModal) {
    settingsModal.classList.add("hidden");
  }
});

// Renk teması değiştirme
const savedColor = localStorage.getItem("colorTheme") || "blue";
document.documentElement.setAttribute("data-color", savedColor);

colorThemes.forEach(btn => {
  if (btn.dataset.color === savedColor) {
    btn.classList.add("active");
  }
  
  btn.addEventListener("click", () => {
    colorThemes.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    document.documentElement.setAttribute("data-color", btn.dataset.color);
    localStorage.setItem("colorTheme", btn.dataset.color);
  });
});

// Dil seçimi (ayarlar modalında)
langSelect.addEventListener("change", () => {
  updateLanguage(langSelect.value);
});

// Toplu işlem
batchBtn.addEventListener("click", async () => {
  const filePaths = await window.kankaAPI.pickMultipleFiles();
  if (!filePaths || filePaths.length === 0) {
    console.log("Dosya seçilmedi veya iptal edildi");
    return;
  }
  
  console.log(`${filePaths.length} dosya seçildi:`, filePaths);
  showLoading(`${filePaths.length} dosya okunuyor...`);
  
  let allFilesContent = [];
  let allFilesData = [];
  let successCount = 0;
  let errorCount = 0;
  
  // Tüm dosyaları oku (AI analizi YOK - sadece içerik göster)
  for (let i = 0; i < filePaths.length; i++) {
    const filePath = filePaths[i];
    const fileName = filePath.split(/[/\\]/).pop();
    
    loadingText.textContent = `${i + 1}/${filePaths.length} dosya okunuyor: ${fileName}`;
    console.log(`Okunuyor [${i + 1}/${filePaths.length}]: ${fileName}`);
    
    try {
      const data = await window.kankaAPI.peekFile(filePath);
      
      if (data.error) {
        console.error(`Dosya okuma hatası: ${fileName}`, data.error);
        allFilesContent.push(`\n❌ ${fileName}\nHata: ${data.error}`);
        errorCount++;
        continue;
      }
      
      const text = data.fullText || data.sample;
      if (!text || text.trim().length === 0) {
        allFilesContent.push(`\n❌ ${fileName}\nHata: Dosya içeriği boş`);
        errorCount++;
        continue;
      }
      
      // Dosya içeriğini listeye ekle (Excel ve UDF için özel format)
      if (data.type === 'xlsx' && data.rows && data.rows.length > 0) {
        // Excel dosyası - tablo olarak ekle
        let excelHtml = `<div style="margin-bottom: 30px;">`;
        excelHtml += `<h3 style="color: var(--primary); margin-bottom: 10px;">📊 ${fileName}</h3>`;
        excelHtml += `<p style="color: var(--text-secondary); margin-bottom: 10px;">Sayfalar: ${data.sheets.join(", ")}</p>`;
        excelHtml += `<table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">`;
        
        data.rows.forEach((row, idx) => {
          const tag = idx === 0 ? "th" : "td";
          excelHtml += "<tr>";
          row.forEach(cell => {
            const style = idx === 0 
              ? 'background: var(--primary); color: white; padding: 8px; border: 1px solid #ddd; font-weight: 600;'
              : 'padding: 8px; border: 1px solid #ddd;';
            excelHtml += `<${tag} style="${style}">${escapeHtml(String(cell || ""))}</${tag}>`;
          });
          excelHtml += "</tr>";
        });
        
        excelHtml += `</table></div>`;
        allFilesContent.push(excelHtml);
      } else if (data.type === 'udf') {
        // UDF dosyası - özel stil ile göster
        let udfHtml = `<div style="margin-bottom: 30px;">`;
        udfHtml += `<h3 style="color: #8B5CF6; margin-bottom: 10px;">⚖️ ${fileName}</h3>`;
        udfHtml += `<div style="padding: 12px; background: rgba(139, 92, 246, 0.05); border-left: 3px solid #8B5CF6; border-radius: 8px; white-space: pre-wrap; font-family: monospace; font-size: 12px; max-height: 400px; overflow-y: auto;">`;
        udfHtml += escapeHtml(text.substring(0, 2000)) + (text.length > 2000 ? "\n..." : "");
        udfHtml += `</div></div>`;
        allFilesContent.push(udfHtml);
      } else {
        // Diğer dosyalar - metin olarak ekle
        allFilesContent.push(`\n📄 ${fileName}\n${"═".repeat(60)}\n${text.substring(0, 1000)}${text.length > 1000 ? "\n..." : ""}`);
      }
      
      allFilesData.push({ fileName, data, text });
      successCount++;
      
      console.log(`✅ Dosya okundu: ${fileName}`);
      
    } catch (error) {
      console.error(`İşlem hatası: ${fileName}`, error);
      allFilesContent.push(`\n❌ ${fileName}\nHata: ${error.message}`);
      errorCount++;
    }
  }
  
  hideLoading();
  
  // Tüm dosya içeriklerini ALT ALTA göster
  let combinedHTML = '';
  allFilesContent.forEach(content => {
    // Eğer HTML içeriyorsa direkt ekle, değilse escape et
    if (content.includes('<table') || content.includes('<div style=')) {
      combinedHTML += content;
    } else {
      combinedHTML += `<div style="white-space: pre-wrap; font-family: monospace; font-size: 13px; margin-bottom: 20px;">${escapeHtml(content)}</div>`;
    }
  });
  
  // İlk dosyanın bilgilerini header'da göster
  if (allFilesData.length > 0) {
    fileName.textContent = `${allFilesData.length} Dosya Seçildi`;
    fileType.textContent = "TOPLU İŞLEM";
    fileInfo.classList.remove("hidden");
    emptyState.classList.add("hidden");
    
    // Tüm içerikleri preview'de göster (HTML + metin karışık)
    preview.innerHTML = combinedHTML;
    
    // Tüm dosyaların tam metnini birleştir (Özetle/Sor butonları için)
    const allTexts = allFilesData.map(item => `=== ${item.fileName} ===\n${item.text}`).join('\n\n');
    
    // Global değişkene kaydet (Özetle/Sor butonları kullanacak)
    currentFileData = {
      name: `${allFilesData.length} Dosya`,
      type: "toplu",
      fullText: allTexts,
      sample: allTexts.substring(0, 2000),
      isBatch: true,
      files: allFilesData
    };
  }
  
  console.log("Toplu işlem tamamlandı:", {
    total: filePaths.length,
    success: successCount,
    error: errorCount
  });
  
  // Bilgi mesajı göster (AI analizi YOK)
  showAIResult(
    `📋 ${successCount} Dosya Hazır`,
    `Toplu işlem tamamlandı!\n\n✅ ${successCount} dosya başarıyla okundu\n${errorCount > 0 ? `❌ ${errorCount} dosya hatalı\n` : ''}\n💡 Analiz yapmak için "Özetle" veya "Sor" butonuna basın.`
  );
});

// Dil değiştirme
function updateLanguage(lang) {
  currentLang = lang;
  localStorage.setItem("appLang", lang);
  langText.textContent = lang.toUpperCase();
  
  // Ayarlar modalındaki select'i de güncelle
  langSelect.value = lang;
  
  const t = translations[lang];
  
  // Butonları güncelle
  pickFileBtn.innerHTML = `<span class="btn-icon">+</span> ${t.pickFile}`;
  batchBtn.innerHTML = `<span class="btn-icon">📚</span> ${t.batchProcess}`;
  document.querySelector(".subtitle").textContent = t.subtitle;
  summaryBtn.innerHTML = `<span class="ai-icon">📝</span> ${t.summary}`;
  askBtn.innerHTML = `<span class="ai-icon">💬</span> ${t.ask}`;
  questionInput.placeholder = t.askQuestion;
  
  // Ayarlar modalını güncelle
  document.querySelector("#settingsModal h2").innerHTML = `⚙️ ${t.settings}`;
  document.querySelectorAll(".settings-section-title")[0].innerHTML = `🎨 ${t.appearance}`;
  document.querySelectorAll(".settings-section-title")[1].innerHTML = `📋 ${t.general}`;
  document.querySelectorAll(".settings-section-title")[2].innerHTML = `ℹ️ ${t.about}`;
  
  // Ayarlar etiketleri
  const labels = document.querySelectorAll(".setting-group label");
  labels[0].textContent = t.themeMode;
  labels[1].textContent = t.colorTheme;
  labels[2].textContent = t.language;
  labels[3].textContent = t.fileHistory;
  
  // Tema butonları
  lightThemeBtn.querySelector("span").textContent = t.light;
  darkThemeBtn.querySelector("span").textContent = t.dark;
  
  // Temizle butonu
  clearHistoryBtn.innerHTML = `<span class="btn-icon">🗑️</span> ${t.clearHistory}`;
  
  // Hakkında bölümü
  document.querySelector(".about-info .version").textContent = t.version;
  document.querySelector(".about-info .description").textContent = t.description;
  document.querySelector(".about-info .copyright").textContent = t.copyright;
  
  console.log(`Dil değiştirildi: ${lang}`);
}

// Dil butonu
langToggle.addEventListener("click", () => {
  const newLang = currentLang === "tr" ? "en" : "tr";
  updateLanguage(newLang);
});

// İlk yüklemede dili ayarla
updateLanguage(currentLang);

// Geçmişi temizle butonu
clearHistoryBtn.addEventListener("click", () => {
  if (confirm("Tüm dosya geçmişi silinecek. Emin misiniz?")) {
    localStorage.removeItem("fileHistory");
    historyList.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">Geçmiş temizlendi</p>';
    console.log("Dosya geçmişi temizlendi");
  }
});

// Dosyayı yeniden yükle butonu
reloadFileBtn.addEventListener("click", () => {
  if (currentFileData && currentFileData.fullPath) {
    console.log("Dosya yeniden yükleniyor:", currentFileData.fullPath);
    loadFile(currentFileData.fullPath);
  }
});

// İlk yükleme mesajı
console.log("✅ KankaAI hazır!");
