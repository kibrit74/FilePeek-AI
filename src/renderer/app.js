// PDF.js Kütüphanesi - require ile yükle (Electron uyumlu)
let pdfjsLibPromise = null;
let pdfPreviewDocumentCache = {
  pdfBase64: "",
  documentPromise: null,
};

async function loadPDFJS() {
  if (window.pdfjsLib?.getDocument) {
    return window.pdfjsLib;
  }

  if (!pdfjsLibPromise) {
    pdfjsLibPromise = import("../../node_modules/pdfjs-dist/build/pdf.mjs").then((module) => {
      module.GlobalWorkerOptions.workerSrc = new URL(
        "../../node_modules/pdfjs-dist/build/pdf.worker.mjs",
        window.location.href
      ).href;
      window.pdfjsLib = module;
      return module;
    });
  }

  return pdfjsLibPromise;
}

function decodePdfBase64(pdfBase64) {
  const pdfData = atob(pdfBase64);
  const pdfArray = new Uint8Array(pdfData.length);
  for (let i = 0; i < pdfData.length; i++) {
    pdfArray[i] = pdfData.charCodeAt(i);
  }
  return pdfArray;
}

async function getPDFDocument(pdfBase64) {
  if (!pdfBase64) {
    throw new Error("PDF verisi eksik.");
  }

  if (pdfPreviewDocumentCache.pdfBase64 === pdfBase64 && pdfPreviewDocumentCache.documentPromise) {
    return pdfPreviewDocumentCache.documentPromise;
  }

  const pdfjsLib = await loadPDFJS();
  const documentPromise = pdfjsLib.getDocument({
    data: decodePdfBase64(pdfBase64),
    isEvalSupported: false,
    enableScripting: false,
  }).promise;

  pdfPreviewDocumentCache = {
    pdfBase64,
    documentPromise,
  };

  return documentPromise;
}

async function renderPDFPage(pdfBase64, pageNumber) {
  try {
    const pdf = await getPDFDocument(pdfBase64);
    const totalPages = pdf.numPages || 1;
    const safePageNumber = Math.min(Math.max(Number(pageNumber) || 1, 1), totalPages);
    const page = await pdf.getPage(safePageNumber);
    
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
    
    return {
      imageUrl: canvas.toDataURL('image/png'),
      pageNumber: safePageNumber,
      totalPages,
    };
  } catch (error) {
    console.error('PDF render hatası:', error);
    return null;
  }
}

async function setupPDFPreview(pdfBase64, initialPage = 1) {
  const loadingEl = document.getElementById("pdf-preview-loading");
  const containerEl = document.getElementById("pdf-preview-container");
  const prevButton = document.getElementById("pdf-prev-page");
  const nextButton = document.getElementById("pdf-next-page");
  const indicator = document.getElementById("pdf-page-indicator");
  const pageInput = document.getElementById("pdf-page-input");

  if (!loadingEl || !containerEl || !prevButton || !nextButton || !indicator || !pageInput) {
    return;
  }

  let currentPage = initialPage;
  let isRendering = false;

  const renderCurrentPage = async () => {
    if (isRendering) return;
    isRendering = true;
    prevButton.disabled = true;
    nextButton.disabled = true;
    loadingEl.style.display = "block";
    containerEl.style.display = "none";

    const result = await renderPDFPage(pdfBase64, currentPage);

    loadingEl.style.display = "none";
    containerEl.style.display = "block";

    if (!result) {
      containerEl.innerHTML = `<p style="color: var(--text-secondary); padding: 20px;">PDF sayfasi goruntulenemedi</p>`;
      indicator.textContent = "- / -";
      isRendering = false;
      return;
    }

    currentPage = result.pageNumber;
    indicator.textContent = `${result.pageNumber} / ${result.totalPages}`;
    pageInput.value = String(result.pageNumber);
    pageInput.max = String(result.totalPages);
    prevButton.disabled = result.pageNumber <= 1;
    nextButton.disabled = result.pageNumber >= result.totalPages;
    containerEl.innerHTML = `<img src="${result.imageUrl}" style="max-width: 100%; border: 1px solid var(--border); border-radius: var(--radius-md); box-shadow: 0 4px 20px rgba(0,0,0,0.1);" alt="PDF Sayfa ${result.pageNumber}">`;
    isRendering = false;
  };

  prevButton.addEventListener("click", () => {
    if (currentPage <= 1) return;
    currentPage -= 1;
    renderCurrentPage();
  });

  nextButton.addEventListener("click", () => {
    currentPage += 1;
    renderCurrentPage();
  });

  pageInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      const requestedPage = Number(pageInput.value);
      if (!Number.isFinite(requestedPage)) {
        pageInput.value = String(currentPage);
        return;
      }
      currentPage = requestedPage;
      renderCurrentPage();
    }
  });

  await renderCurrentPage();
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
const voiceQuestionBtn = document.getElementById("voiceQuestionBtn");
const aiResult = document.getElementById("aiResult");
const aiPanel = document.getElementById("aiPanel");
const aiPanelToggle = document.getElementById("aiPanelToggle");
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
const clearRecentFilesBtn = document.getElementById("clearRecentFilesBtn");
const lightThemeBtn = document.getElementById("lightThemeBtn");
const darkThemeBtn = document.getElementById("darkThemeBtn");
const reloadFileBtn = document.getElementById("reloadFileBtn");
const tabStrip = document.getElementById("tabStrip");
const toolbarOpenBtn = document.getElementById("toolbarOpenBtn");
const toolbarReloadBtn = document.getElementById("toolbarReloadBtn");
const addressField = document.getElementById("addressField");
const emptyOpenBtn = document.getElementById("emptyOpenBtn");
const appRoot = document.getElementById("app");
const sidebar = document.querySelector(".sidebar");
const sidebarToggleBtn = document.getElementById("sidebarToggleBtn");
const toolbarLangToggle = document.getElementById("toolbarLangToggle");
const toolbarLangText = document.getElementById("toolbarLangText");
const toolbarSettingsBtn = document.getElementById("toolbarSettingsBtn");
const previewFullscreenBtn = document.getElementById("previewFullscreenBtn");
const excelFullscreenBtn = document.getElementById("excelFullscreenBtn");
const fileQuickToolbar = document.getElementById("fileQuickToolbar");
const uploadPanelTitle = document.querySelector(".upload-panel-header span");
const dropZoneLabel = dropZone ? dropZone.querySelector("p") : null;
const recentFilesTitle = document.querySelector(".file-history h4");
const historySearchInput = document.getElementById("historySearchInput");
const infoFooterLabel = document.querySelector(".info-footer span");
const selectedContextBar = document.getElementById("selectedContextBar");
const selectedContextText = document.getElementById("selectedContextText");
const askSelectionBtn = document.getElementById("askSelectionBtn");
const selectionMailBtn = document.getElementById("selectionMailBtn");
const selectionCalendarBtn = document.getElementById("selectionCalendarBtn");
const questionContextScopeSelect = document.getElementById("questionContextScopeSelect");
const clearSelectionContextBtn = document.getElementById("clearSelectionContextBtn");
const selectionMailModal = document.getElementById("selectionMailModal");
const closeSelectionMailModal = document.getElementById("closeSelectionMailModal");
const cancelSelectionMailBtn = document.getElementById("cancelSelectionMailBtn");
const selectionMailToInput = document.getElementById("selectionMailToInput");
const selectionMailSubjectInput = document.getElementById("selectionMailSubjectInput");
const selectionMailBodyInput = document.getElementById("selectionMailBodyInput");
const selectionMailLanguageSelect = document.getElementById("selectionMailLanguageSelect");
const selectionMailDetailSelect = document.getElementById("selectionMailDetailSelect");
const selectionMailGenerateBtn = document.getElementById("selectionMailGenerateBtn");
const openSelectionMailDraftBtn = document.getElementById("openSelectionMailDraftBtn");
const selectionCalendarModal = document.getElementById("selectionCalendarModal");
const closeSelectionCalendarModal = document.getElementById("closeSelectionCalendarModal");
const cancelSelectionCalendarBtn = document.getElementById("cancelSelectionCalendarBtn");
const selectionCalendarTitleInput = document.getElementById("selectionCalendarTitleInput");
const selectionCalendarDateInput = document.getElementById("selectionCalendarDateInput");
const selectionCalendarStartInput = document.getElementById("selectionCalendarStartInput");
const selectionCalendarEndInput = document.getElementById("selectionCalendarEndInput");
const selectionCalendarDetailsInput = document.getElementById("selectionCalendarDetailsInput");
const selectionCalendarGenerateBtn = document.getElementById("selectionCalendarGenerateBtn");
const openSelectionCalendarDraftBtn = document.getElementById("openSelectionCalendarDraftBtn");
const settingsKicker = document.querySelector(".settings-kicker");
const settingsLead = document.querySelector(".settings-lead");
const appearanceSettingsTitle = document.getElementById("appearanceSettingsTitle");
const generalSettingsTitle = document.getElementById("generalSettingsTitle");
const aiSettingsTitle = document.getElementById("aiSettingsTitle");
const aboutSettingsTitle = document.getElementById("aboutSettingsTitle");
const themeModeLabel = document.getElementById("themeModeLabel");
const colorThemeLabel = document.getElementById("colorThemeLabel");
const languageLabel = document.getElementById("languageLabel");
const fileHistoryLabel = document.getElementById("fileHistoryLabel");
const aiProviderSelect = document.getElementById("aiProviderSelect");
const aiSettingsStatus = document.getElementById("aiSettingsStatus");
const saveAISettingsBtn = document.getElementById("saveAISettingsBtn");
const providerCards = document.querySelectorAll(".provider-card");
const googleEdgeTitle = document.getElementById("googleEdgeTitle");
const googleEdgeDescription = document.getElementById("googleEdgeDescription");
const localSTTStatus = document.getElementById("localSTTStatus");
const localSTTInstallBtn = document.getElementById("localSTTInstallBtn");

// Çeviri metinleri
const translations = {
  tr: {
    pickFile: "Dosya Aç",
    batchProcess: "Toplu İşlem",
    subtitle: "İçini gör, anında",
    uploadSection: "Dosya Yükleme",
    dragDrop: "Dosya sürükleyin",
    or: "veya",
    selectFile: "Dosya Seç",
    loading: "Yükleniyor...",
    summary: "Özetle",
    describe: "Betimle",
    edit: "Düzenle",
    translate: "Çevir",
    read: "Oku",
    stop: "Durdur",
    ask: "Sor",
    askQuestion: "Soru sor...",
    noFile: "Henüz dosya seçilmedi",
    recentFiles: "Son Açılan Dosyalar",
    emptyHistory: "Henüz dosya açılmadı",
    privacyNote: "Verileriniz cihazınızda",
    settings: "Ayarlar",
    settingsKicker: "Tercihler",
    settingsLead: "Görünüm, dil ve yerel tercihleri tek merkezden yönetin.",
    appearance: "Görünüm",
    themeMode: "Tema Modu",
    light: "Açık",
    dark: "Koyu",
    colorTheme: "Renk Teması",
    language: "Dil",
    general: "Genel",
    fileHistory: "Dosya Geçmişi",
    clearHistory: "Geçmişi Temizle",
    clearHistoryConfirm: "Tüm dosya geçmişi silinecek. Emin misiniz?",
    aiSettings: "AI Sağlayıcıları",
    aiProvider: "Varsayılan Sağlayıcı",
    saveAISettings: "AI Ayarlarını Kaydet",
    aiSettingsIdle: "AI ayarları hazır değil.",
    aiSettingsSaved: "AI ayarları kaydedildi.",
    readyStatus: "Hazır.",
    geminiProvider: "Gemini",
    refreshModels: "Modelleri Yenile",
    testConnection: "Bağlantıyı Test Et",
    apiKey: "API Key",
    baseUrl: "Base URL",
    baseUrlDefaultHint: "Normalde değiştirme. OpenRouter için varsayılan adres budur.",
    textModel: "Metin Modeli",
    visionModel: "Görsel Modeli",
    textModelId: "Metin Model ID",
    visionModelId: "Görsel Model ID",
    clearSavedKey: "Kayıtlı anahtarı temizle",
    savedKeyMissing: "Kayıtlı anahtar yok.",
    savedKeyPresent: "Kayıtlı anahtar: ",
    savedKeyPlaceholder: "Kayıtlı anahtar var",
    ollamaOptionalKey: "Yerel Ollama için anahtar gerekmez.",
    ollamaPullPlaceholder: "Örn: gemma4",
    pullModel: "Model İndir",
    modelsLoaded: "Model listesi güncellendi",
    connectionSuccess: "Bağlantı başarılı",
    noModelsFound: "Model bulunamadı",
    googleEdgeTitle: "Google AI Edge / Gemma 4",
    googleEdgeDescription: "Google AI Edge, ayrı bir on-device runtime ister. Bu sürümde çalışma yolu Ollama + gemma4 olarak bağlı.",
    fullscreen: "Tam ekran",
    exitFullscreen: "Tam ekrandan çık",
    removeFromHistory: "Geçmişten Sil",
    pinHistory: "Sabitle",
    unpinHistory: "Sabitlemeyi Kaldır",
    historySearch: "Dosya ara",
    selectedContext: "Seçili Metin",
    selectionScopeLabel: "Soru Bağlamı",
    selectionScopeSelection: "Yalnızca Seçim",
    selectionScopeDocument: "Tüm Belge",
    askSelection: "Seçileni Sor",
    sendAsMail: "Mail Olarak Gönder",
    addToCalendar: "Takvime Ekle",
    selectionQuestionPlaceholder: "Seçili metin hakkında soru sor...",
    toolbarActions: {
      summarize: "Özet",
      translate: "Çevir",
      read: "Oku",
      ask: "Soru Sor",
      edit: "Düzenle",
      text: "Metin",
      preview: "Önizleme"
    },
    about: "Hakkında",
    version: "v1.0.0",
    description: "AI destekli dosya önizleme ve analiz aracı",
    copyright: "© 2024 FilePeek AI Team"
  },
  en: {
    pickFile: "Open File",
    batchProcess: "Batch Process",
    subtitle: "See inside, instantly",
    uploadSection: "File Upload",
    dragDrop: "Drag a file here",
    or: "or",
    selectFile: "Select File",
    loading: "Loading...",
    summary: "Summarize",
    describe: "Describe",
    edit: "Edit",
    translate: "Translate",
    read: "Read",
    stop: "Stop",
    ask: "Ask",
    askQuestion: "Ask a question...",
    noFile: "No file selected yet",
    recentFiles: "Recent Files",
    emptyHistory: "No files opened yet",
    privacyNote: "Your data stays on this device",
    settings: "Settings",
    settingsKicker: "Preferences",
    settingsLead: "Manage appearance, language, and local preferences from one place.",
    appearance: "Appearance",
    themeMode: "Theme Mode",
    light: "Light",
    dark: "Dark",
    colorTheme: "Color Theme",
    language: "Language",
    general: "General",
    fileHistory: "File History",
    clearHistory: "Clear History",
    clearHistoryConfirm: "This will remove all file history. Continue?",
    aiSettings: "AI Providers",
    aiProvider: "Default Provider",
    saveAISettings: "Save AI Settings",
    aiSettingsIdle: "AI settings are not loaded yet.",
    aiSettingsSaved: "AI settings saved.",
    readyStatus: "Ready.",
    geminiProvider: "Gemini",
    refreshModels: "Refresh Models",
    testConnection: "Test Connection",
    apiKey: "API Key",
    baseUrl: "Base URL",
    baseUrlDefaultHint: "Normally leave this as-is. This is the default OpenRouter endpoint.",
    textModel: "Text Model",
    visionModel: "Vision Model",
    textModelId: "Text Model ID",
    visionModelId: "Vision Model ID",
    clearSavedKey: "Clear saved key",
    savedKeyMissing: "No saved key.",
    savedKeyPresent: "Saved key: ",
    savedKeyPlaceholder: "Saved key exists",
    ollamaOptionalKey: "No key is required for local Ollama.",
    ollamaPullPlaceholder: "Example: gemma4",
    pullModel: "Pull Model",
    modelsLoaded: "Model list refreshed",
    connectionSuccess: "Connection successful",
    noModelsFound: "No models found",
    googleEdgeTitle: "Google AI Edge / Gemma 4",
    googleEdgeDescription: "Google AI Edge requires a separate on-device runtime. In this build, the working Gemma 4 path is Ollama + gemma4.",
    fullscreen: "Enter fullscreen",
    exitFullscreen: "Exit fullscreen",
    removeFromHistory: "Remove from History",
    pinHistory: "Pin",
    unpinHistory: "Unpin",
    historySearch: "Search files",
    selectedContext: "Selected Text",
    selectionScopeLabel: "Question Scope",
    selectionScopeSelection: "Selection Only",
    selectionScopeDocument: "Full Document",
    askSelection: "Ask About Selection",
    sendAsMail: "Send as Mail",
    addToCalendar: "Add to Calendar",
    selectionQuestionPlaceholder: "Ask about the selected text...",
    toolbarActions: {
      summarize: "Summary",
      translate: "Translate",
      read: "Read",
      ask: "Ask",
      edit: "Edit",
      text: "Text",
      preview: "Preview"
    },
    about: "About",
    version: "v1.0.0",
    description: "AI-powered file preview and analysis tool",
    copyright: "© 2024 FilePeek AI Team"
  }
};

const uiIcons = {
  sparkles: '<svg viewBox="0 0 24 24"><path d="M12 3l1.9 4.6L18.5 9l-4.6 1.4L12 15l-1.9-4.6L5.5 9l4.6-1.4L12 3Z"></path><path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z"></path></svg>',
  pencil: '<svg viewBox="0 0 24 24"><path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"></path></svg>',
  spreadsheet: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"></rect><path d="M8 4v16M3 10h18"></path><path d="M14 14l4-4"></path><path d="M15 10h3v3"></path></svg>',
  languages: '<svg viewBox="0 0 24 24"><path d="M5 8h10"></path><path d="M10 4v4c0 4-2 7-5 9"></path><path d="M8 12c1.2 1.9 3 3.7 5 5"></path><path d="M15 6h6"></path><path d="M18 6c0 5-2 9-5 12"></path><path d="M16 16h6"></path></svg>',
  volume: '<svg viewBox="0 0 24 24"><path d="M11 5 6 9H3v6h3l5 4V5Z"></path><path d="M15.5 8.5a5 5 0 0 1 0 7"></path><path d="M18.5 5.5a9 9 0 0 1 0 13"></path></svg>',
  stop: '<svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2"></rect></svg>',
  searchMessage: '<svg viewBox="0 0 24 24"><path d="M21 11.5a8.5 8.5 0 1 1-4.2-7.3"></path><path d="M22 22l-4.3-4.3"></path></svg>',
  expand: '<svg viewBox="0 0 24 24"><path d="M8 3H3v5"></path><path d="M16 3h5v5"></path><path d="M21 16v5h-5"></path><path d="M8 21H3v-5"></path></svg>',
  compress: '<svg viewBox="0 0 24 24"><path d="M9 3H3v6"></path><path d="M15 3h6v6"></path><path d="M21 15v6h-6"></path><path d="M3 15v6h6"></path><path d="M8 8 3 3"></path><path d="M16 8l5-5"></path><path d="M8 16l-5 5"></path><path d="m16 16 5 5"></path></svg>'
};

function getIconMarkup(name, className = "ai-icon") {
  const icon = uiIcons[name] || "";
  return `<span class="${className}" aria-hidden="true">${icon}</span>`;
}

function setButtonContentWithIcon(button, iconName, label, className = "ai-icon") {
  if (!button) return;
  button.innerHTML = `${getIconMarkup(iconName, className)}<span>${escapeHtml(label)}</span>`;
}

function getCurrentTranslation() {
  return translations[currentLang] || translations.tr;
}

function getEmptyHistoryMarkup() {
  const t = getCurrentTranslation();
  return `<li class="history-empty"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg><p>${escapeHtml(t.emptyHistory)}</p></li>`;
}

function getPinnedHistoryPaths() {
  const rawValue = localStorage.getItem("fileHistoryPinned");
  if (!rawValue) return [];

  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch (error) {
    console.warn("Pinned history parse edilemedi:", error);
    return [];
  }
}

function savePinnedHistoryPaths(paths) {
  localStorage.setItem("fileHistoryPinned", JSON.stringify(paths.slice(0, 10)));
}

function togglePinnedHistory(filePath) {
  if (!filePath) return;
  const pinnedPaths = getPinnedHistoryPaths();
  const nextPinnedPaths = pinnedPaths.includes(filePath)
    ? pinnedPaths.filter((path) => path !== filePath)
    : [filePath, ...pinnedPaths.filter((path) => path !== filePath)];
  savePinnedHistoryPaths(nextPinnedPaths);
  updateHistoryUI();
}

function getFilteredHistory() {
  const normalizedSearch = historySearchTerm.trim().toLocaleLowerCase("tr-TR");
  const pinnedPaths = new Set(getPinnedHistoryPaths());
  const history = getFileHistory();
  const filtered = normalizedSearch
    ? history.filter((item) => `${item.name || ""} ${item.path || ""}`.toLocaleLowerCase("tr-TR").includes(normalizedSearch))
    : history.slice();

  return filtered.sort((left, right) => {
    const leftPinned = pinnedPaths.has(left.path);
    const rightPinned = pinnedPaths.has(right.path);
    if (leftPinned !== rightPinned) {
      return leftPinned ? -1 : 1;
    }
    return Number(right.date || 0) - Number(left.date || 0);
  });
}

function truncateText(text, limit = 180) {
  const normalized = String(text || "").trim().replace(/\s+/g, " ");
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, limit - 1)}…`;
}

function sanitizeJsonFence(text) {
  return String(text || "")
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

function parseDraftJson(text, fallback = {}) {
  try {
    return JSON.parse(sanitizeJsonFence(text));
  } catch (_error) {
    return fallback;
  }
}

function openModal(modal) {
  if (!modal) return;
  modal.classList.remove("hidden");
}

function closeModal(modal) {
  if (!modal) return;
  modal.classList.add("hidden");
}

function padTwo(value) {
  return String(value || "").padStart(2, "0");
}

function formatGoogleCalendarDate(dateValue, timeValue = "09:00") {
  const [year, month, day] = String(dateValue || "").split("-");
  const [hours, minutes] = String(timeValue || "09:00").split(":");
  return `${year}${month}${day}T${padTwo(hours)}${padTwo(minutes)}00`;
}

async function openExternalUrl(url) {
  const result = await window.kankaAPI.openExternalUrl(url);
  if (!result?.success) {
    throw new Error(result?.error || "Harici sayfa açılamadı.");
  }
}

function getSelectedPreviewContextOrThrow() {
  if (!selectedPreviewContext) {
    updateSelectedPreviewContext();
  }

  if (!selectedPreviewContext) {
    throw new Error("Önce bir metin seçin.");
  }

  return selectedPreviewContext;
}

function getTodayDateValue() {
  const today = new Date();
  return `${today.getFullYear()}-${padTwo(today.getMonth() + 1)}-${padTwo(today.getDate())}`;
}

function openMailDraftModalFromSelection() {
  let selectedText = "";
  try {
    selectedText = getSelectedPreviewContextOrThrow();
  } catch (error) {
    showError(error.message || "Mail taslağı hazırlanamadı.");
    return;
  }

  if (selectionMailToInput && !selectionMailToInput.value) {
    selectionMailToInput.value = "";
  }
  if (selectionMailSubjectInput && !selectionMailSubjectInput.value.trim()) {
    selectionMailSubjectInput.value = truncateText(selectedText, 80);
  }
  if (selectionMailBodyInput && !selectionMailBodyInput.value.trim()) {
    selectionMailBodyInput.value = selectedText;
  }

  openModal(selectionMailModal);
}

async function requestMailDraftFromSelection() {
  const selectedText = getSelectedPreviewContextOrThrow();
  const selectedLanguage = selectionMailLanguageSelect?.value || "tr";
  const selectedDetail = selectionMailDetailSelect?.value || "normal";
  const languageInstruction = selectedLanguage === "en"
    ? "E-posta dili İngilizce olsun."
    : "E-posta dili Türkçe olsun.";
  const detailInstruction = {
    short: "Kısa ve doğrudan yaz.",
    normal: "Dengeli uzunlukta yaz.",
    detailed: "Daha detaylı ve bağlam veren bir metin yaz.",
  }[selectedDetail] || "Dengeli uzunlukta yaz.";

  const prompt = [
    "Aşağıdaki seçili belge parçasından e-posta taslağı üret.",
    "JSON dışında hiçbir şey yazma.",
    'Şema: {"subject":"", "body":""}',
    "Body sade ve profesyonel olsun.",
    languageInstruction,
    detailInstruction,
    "",
    selectedText,
  ].join("\n");

  const result = await window.kankaAPI.aiQuestion(prompt, "Bu seçili metin için mail taslağı oluştur.");
  if (!result?.success) {
    throw new Error(result?.error || "Mail taslağı oluşturulamadı.");
  }

  const draft = parseDraftJson(result.answer, {});
  selectionMailSubjectInput.value = draft.subject || truncateText(selectedText, 80);
  selectionMailBodyInput.value = draft.body || selectedText;
  openModal(selectionMailModal);
}

function openCalendarDraftModalFromSelection() {
  let selectedText = "";
  try {
    selectedText = getSelectedPreviewContextOrThrow();
  } catch (error) {
    showError(error.message || "Takvim taslağı hazırlanamadı.");
    return;
  }
  const fallbackDate = getTodayDateValue();

  if (selectionCalendarTitleInput && !selectionCalendarTitleInput.value.trim()) {
    selectionCalendarTitleInput.value = truncateText(selectedText, 60);
  }
  if (selectionCalendarDateInput && !selectionCalendarDateInput.value) {
    selectionCalendarDateInput.value = fallbackDate;
  }
  if (selectionCalendarStartInput && !selectionCalendarStartInput.value) {
    selectionCalendarStartInput.value = "09:00";
  }
  if (selectionCalendarEndInput && !selectionCalendarEndInput.value) {
    selectionCalendarEndInput.value = "10:00";
  }
  if (selectionCalendarDetailsInput && !selectionCalendarDetailsInput.value.trim()) {
    selectionCalendarDetailsInput.value = selectedText;
  }

  openModal(selectionCalendarModal);
}

async function requestCalendarDraftFromSelection() {
  const selectedText = getSelectedPreviewContextOrThrow();
  const fallbackDate = getTodayDateValue();
  const prompt = [
    "Aşağıdaki seçili belge parçasından takvim taslağı çıkar.",
    "JSON dışında hiçbir şey yazma.",
    'Şema: {"title":"","date":"YYYY-MM-DD","startTime":"HH:MM","endTime":"HH:MM","details":""}',
    "Tarih emin değilse bugünün tarihini kullanma, boş bırak.",
    "",
    selectedText,
  ].join("\n");

  const result = await window.kankaAPI.aiQuestion(prompt, "Bu seçili metin için takvim etkinliği taslağı çıkar.");
  if (!result?.success) {
    throw new Error(result?.error || "Takvim taslağı oluşturulamadı.");
  }

  const draft = parseDraftJson(result.answer, {});
  selectionCalendarTitleInput.value = draft.title || truncateText(selectedText, 60);
  selectionCalendarDateInput.value = /^\d{4}-\d{2}-\d{2}$/.test(draft.date || "") ? draft.date : fallbackDate;
  selectionCalendarStartInput.value = /^\d{2}:\d{2}$/.test(draft.startTime || "") ? draft.startTime : "09:00";
  selectionCalendarEndInput.value = /^\d{2}:\d{2}$/.test(draft.endTime || "") ? draft.endTime : "10:00";
  selectionCalendarDetailsInput.value = draft.details || selectedText;
  openModal(selectionCalendarModal);
}

function clearSelectedPreviewContext() {
  selectedPreviewContext = "";
  questionContextScope = "selection";
  if (selectedContextText) {
    selectedContextText.textContent = "";
  }
  if (selectedContextBar) {
    selectedContextBar.classList.add("hidden");
  }
  if (questionInput && document.activeElement !== questionInput) {
    questionInput.placeholder = getCurrentTranslation().askQuestion;
  }
  updateQuestionContextScopeUI();
}

function updateSelectedPreviewContext(forceText = "") {
  const selection = window.getSelection();
  const rawText = forceText || selection?.toString?.() || "";
  const normalizedText = rawText.replace(/\s+/g, " ").trim();

  if (!normalizedText || !preview?.contains(selection?.anchorNode)) {
    clearSelectedPreviewContext();
    return;
  }

  selectedPreviewContext = normalizedText;
  if (selectedContextText) {
    selectedContextText.textContent = truncateText(normalizedText, 220);
  }
  if (selectedContextBar) {
    selectedContextBar.classList.remove("hidden");
  }
  setQuestionContextScope("selection");
  updateQuestionContextScopeUI();
}

function setQuestionContextScope(scope) {
  questionContextScope = scope === "document" ? "document" : "selection";
  if (questionContextScopeSelect) {
    questionContextScopeSelect.value = questionContextScope;
  }
}

function updateQuestionContextScopeUI() {
  const t = getCurrentTranslation();
  const usingSelectionScope = shouldUseSelectedContextForQuestion();
  const scopeLabel = selectedContextBar?.querySelector(".selected-context-scope-label");

  if (scopeLabel) {
    scopeLabel.textContent = t.selectionScopeLabel;
  }

  if (questionContextScopeSelect) {
    questionContextScopeSelect.value = questionContextScope;
    questionContextScopeSelect.disabled = !selectedPreviewContext;
    const selectionOption = questionContextScopeSelect.querySelector('option[value="selection"]');
    const documentOption = questionContextScopeSelect.querySelector('option[value="document"]');
    if (selectionOption) selectionOption.textContent = t.selectionScopeSelection;
    if (documentOption) documentOption.textContent = t.selectionScopeDocument;
  }

  if (questionInput && document.activeElement !== questionInput) {
    questionInput.placeholder = usingSelectionScope ? t.selectionQuestionPlaceholder : t.askQuestion;
  }
}

function shouldUseSelectedContextForQuestion() {
  return Boolean(selectedPreviewContext) && questionContextScope !== "document";
}

function getQuestionContextText(question) {
  if (selectedPreviewContext && shouldUseSelectedContextForQuestion()) {
    return [
      "Kullanıcı belge içinden şu bölümü seçti:",
      selectedPreviewContext,
      "",
      `Soru: ${question}`,
    ].join("\n");
  }

  if (currentFileData?.isBatch && currentFileData.batchIndex) {
    return currentFileData.batchIndex.buildQuestionContext(question);
  }

  if (currentFileData?.type === "xlsx" && window.FilePeekExcelSearch?.buildFocusedExcelQuestionContext) {
    const focused = window.FilePeekExcelSearch.buildFocusedExcelQuestionContext(currentFileData, question);
    if (focused?.contextText) {
      return focused.contextText;
    }
  }

  return currentFileData?.fullText || currentFileData?.sample || "";
}

function getFileQuickActions(fileData) {
  const t = getCurrentTranslation();
  const type = getPreviewType(fileData || {});
  const baseActions = [
    { id: "summarize", label: t.toolbarActions.summarize },
    { id: "translate", label: t.toolbarActions.translate },
    { id: "read", label: t.toolbarActions.read },
    { id: "ask", label: t.toolbarActions.ask },
  ];

  if (type === "docx" || type === "xlsx") {
    baseActions.splice(1, 0, { id: "edit", label: t.toolbarActions.edit });
  }

  if (type === "pdf") {
    baseActions.unshift({ id: "preview", label: t.toolbarActions.preview });
    baseActions.push({ id: "text", label: t.toolbarActions.text });
  }

  return baseActions;
}

function renderFileQuickToolbar(fileData) {
  if (!fileQuickToolbar) return;
  const actions = getFileQuickActions(fileData);

  if (!fileData || !actions.length) {
    fileQuickToolbar.classList.add("hidden");
    fileQuickToolbar.innerHTML = "";
    return;
  }

  fileQuickToolbar.classList.remove("hidden");
  fileQuickToolbar.innerHTML = actions.map((action) => `
    <button class="file-quick-action" type="button" data-action="${action.id}">
      ${escapeHtml(action.label)}
    </button>
  `).join("");
}

function refreshActionButtons() {
  const t = getCurrentTranslation();
  const wordEditButton = document.getElementById("editWordBtn");
  const excelEditButton = document.getElementById("editExcelBtn");
  const summaryLabel = currentFileData?.type === "image" ? t.describe : t.summary;
  const speakLabel = window.speechSynthesis?.speaking ? t.stop : t.read;
  const speakIcon = window.speechSynthesis?.speaking ? "stop" : "volume";

  setButtonContentWithIcon(summaryBtn, "sparkles", summaryLabel);
  setButtonContentWithIcon(wordEditButton, "pencil", t.edit);
  setButtonContentWithIcon(excelEditButton, "spreadsheet", t.edit);
  setButtonContentWithIcon(translateBtn, "languages", t.translate);
  setButtonContentWithIcon(speakBtn, speakIcon, speakLabel);
  setButtonContentWithIcon(askBtn, "searchMessage", t.ask);
  updatePreviewFullscreenButton();
}

function updatePreviewFullscreenButton() {
  if (!previewFullscreenBtn) return;
  const t = getCurrentTranslation();
  const label = isPreviewFullscreen ? t.exitFullscreen : t.fullscreen;
  previewFullscreenBtn.title = label;
  previewFullscreenBtn.setAttribute("aria-label", label);
  previewFullscreenBtn.setAttribute("aria-pressed", String(isPreviewFullscreen));
  previewFullscreenBtn.innerHTML = `${getIconMarkup(isPreviewFullscreen ? "compress" : "expand", "modal-btn-icon")}<span>${escapeHtml(label)}</span>`;
}

function setPreviewFullscreen(nextState) {
  if (!fileInfo) return;
  isPreviewFullscreen = Boolean(nextState);
  fileInfo.classList.toggle("is-preview-fullscreen", isPreviewFullscreen);
  document.body.classList.toggle("preview-fullscreen-open", isPreviewFullscreen);
  updatePreviewFullscreenButton();

  if (isPreviewFullscreen && preview) {
    preview.focus({ preventScroll: true });
  }
}

const AI_PROVIDER_IDS = ["openai", "anthropic", "openrouter", "gemini", "ollama"];
const PROVIDER_LABELS = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  openrouter: "OpenRouter",
  gemini: "Gemini",
  ollama: "Ollama",
};
const aiProviderFields = {
  openai: {
    apiKeyInput: document.getElementById("openaiApiKey"),
    apiKeyHint: document.getElementById("openaiApiKeyHint"),
    baseUrlInput: document.getElementById("openaiBaseUrl"),
    textModelSelect: document.getElementById("openaiTextModel"),
    visionModelSelect: document.getElementById("openaiVisionModel"),
    statusNode: document.getElementById("openaiProviderStatus"),
    refreshButton: document.getElementById("openaiRefreshModelsBtn"),
    testButton: document.getElementById("openaiTestBtn"),
    clearKeyButton: document.getElementById("openaiClearKeyBtn"),
  },
  anthropic: {
    apiKeyInput: document.getElementById("anthropicApiKey"),
    apiKeyHint: document.getElementById("anthropicApiKeyHint"),
    baseUrlInput: document.getElementById("anthropicBaseUrl"),
    textModelSelect: document.getElementById("anthropicTextModel"),
    visionModelSelect: document.getElementById("anthropicVisionModel"),
    statusNode: document.getElementById("anthropicProviderStatus"),
    refreshButton: document.getElementById("anthropicRefreshModelsBtn"),
    testButton: document.getElementById("anthropicTestBtn"),
    clearKeyButton: document.getElementById("anthropicClearKeyBtn"),
  },
  openrouter: {
    apiKeyInput: document.getElementById("openrouterApiKey"),
    apiKeyHint: document.getElementById("openrouterApiKeyHint"),
    baseUrlInput: document.getElementById("openrouterBaseUrl"),
    baseUrlHint: document.getElementById("openrouterBaseUrlHint"),
    textModelSelect: document.getElementById("openrouterTextModel"),
    visionModelSelect: document.getElementById("openrouterVisionModel"),
    statusNode: document.getElementById("openrouterProviderStatus"),
    customTextModelInput: document.getElementById("openrouterCustomTextModel"),
    customVisionModelInput: document.getElementById("openrouterCustomVisionModel"),
    refreshButton: document.getElementById("openrouterRefreshModelsBtn"),
    testButton: document.getElementById("openrouterTestBtn"),
    clearKeyButton: document.getElementById("openrouterClearKeyBtn"),
  },
  gemini: {
    apiKeyInput: document.getElementById("geminiApiKey"),
    apiKeyHint: document.getElementById("geminiApiKeyHint"),
    baseUrlInput: document.getElementById("geminiBaseUrl"),
    textModelSelect: document.getElementById("geminiTextModel"),
    visionModelSelect: document.getElementById("geminiVisionModel"),
    statusNode: document.getElementById("geminiProviderStatus"),
    refreshButton: document.getElementById("geminiRefreshModelsBtn"),
    testButton: document.getElementById("geminiTestBtn"),
    clearKeyButton: document.getElementById("geminiClearKeyBtn"),
  },
  ollama: {
    apiKeyInput: document.getElementById("ollamaApiKey"),
    apiKeyHint: document.getElementById("ollamaApiKeyHint"),
    baseUrlInput: document.getElementById("ollamaBaseUrl"),
    textModelSelect: document.getElementById("ollamaTextModel"),
    visionModelSelect: document.getElementById("ollamaVisionModel"),
    statusNode: document.getElementById("ollamaProviderStatus"),
    refreshButton: document.getElementById("ollamaRefreshModelsBtn"),
    testButton: document.getElementById("ollamaTestBtn"),
    clearKeyButton: document.getElementById("ollamaClearKeyBtn"),
    pullInput: document.getElementById("ollamaPullModelInput"),
    pullButton: document.getElementById("ollamaPullModelBtn"),
  }
};

// Aktif dosya verisi
let tabState = window.FilePeekTabs.createTabState();
let currentFileData = null;
let lastAIResult = null;
let currentLang = localStorage.getItem("appLang") || "tr";
let historySearchTerm = "";
let selectedPreviewContext = "";
let questionContextScope = "selection";
let isExcelFullscreen = false;
let isPreviewFullscreen = false;
let aiSettingsState = null;
let aiModelCache = {};
if (!translations[currentLang]) {
  currentLang = "tr";
}

function getActiveDocumentTab() {
  return window.FilePeekTabs.getActiveTab(tabState);
}

function syncActiveFileState() {
  const activeTab = getActiveDocumentTab();
  currentFileData = activeTab?.data || null;
  lastAIResult = activeTab?.aiResult || null;
}

function formatAddress(filePath) {
  if (!filePath) return "Yeni sekme";
  const normalized = String(filePath).replace(/\\/g, "/");
  if (normalized.length <= 86) return normalized;
  return `.../${normalized.split("/").slice(-3).join("/")}`;
}

function getFileNameFromPath(filePath) {
  return String(filePath || "").split(/[\\/]/).pop() || "Dosya";
}

function inferFileTypeFromPath(filePath) {
  const ext = getFileNameFromPath(filePath).split(".").pop()?.toLowerCase() || "";

  if (!ext) return "text";
  if (["jpg", "jpeg", "png", "gif", "webp", "bmp"].includes(ext)) return "image";
  if (["md", "csv"].includes(ext)) return "text";

  return ext;
}

function getPreviewType(data = {}) {
  if (window.FilePeekPreviewModel) {
    return window.FilePeekPreviewModel.getPreviewType(data);
  }

  const type = String(data.type || "").toLowerCase();

  if (["text", "txt", "md", "csv"].includes(type)) return "text";
  if (["image", "jpg", "jpeg", "png", "gif", "webp", "bmp"].includes(type)) return "image";
  if (["xlsx", "xls"].includes(type)) return "xlsx";
  if (["pdf", "docx", "zip", "udf"].includes(type)) return type;

  return type || "unknown";
}

function getReadablePreviewText(data = {}, fallback = "Bu dosya için okunabilir bir içerik bulunamadı.") {
  if (window.FilePeekPreviewModel) {
    return window.FilePeekPreviewModel.getReadablePreviewText(data, fallback);
  }

  const normalized = [data.sample, data.fullText]
    .map(candidate => (
      typeof candidate === "string"
        ? candidate.trim()
        : String(candidate || "").trim()
    ))
    .find(Boolean);

  return normalized || fallback;
}

function renderTabs() {
  if (!tabStrip) return;

  const tabsHtml = tabState.openTabs.map(tab => {
    const activeClass = tab.id === tabState.activeTabId ? " active" : "";
    const statusClass = tab.status === "loading" ? " loading" : tab.status === "error" ? " error" : "";
    const icon = tab.status === "error" ? "!" : tab.status === "loading" ? "..." : getFileIcon(tab.type || tab.data?.type || "");

    return `
      <button class="document-tab${activeClass}${statusClass}" data-tab-id="${escapeAttribute(tab.id)}" title="${escapeAttribute(tab.filePath)}">
        <span class="tab-file-icon">${icon}</span>
        <span class="tab-title">${escapeHtml(tab.name)}</span>
        <span class="tab-close" data-close-tab="${escapeAttribute(tab.id)}" title="Sekmeyi kapat">&times;</span>
      </button>
    `;
  }).join("");

  tabStrip.innerHTML = `${tabsHtml}<button class="new-tab-button" id="newTabButton" title="Yeni dosya aç">+</button>`;

  tabStrip.querySelectorAll(".document-tab").forEach(tabEl => {
    tabEl.addEventListener("click", () => {
      tabState = window.FilePeekTabs.setActiveTab(tabState, tabEl.dataset.tabId);
      renderActiveTab();
    });
  });

  tabStrip.querySelectorAll(".tab-close").forEach(closeEl => {
    closeEl.addEventListener("click", (event) => {
      event.stopPropagation();
      tabState = window.FilePeekTabs.closeTab(tabState, closeEl.dataset.closeTab);
      renderActiveTab();
    });
  });

  const newTabButton = tabStrip.querySelector("#newTabButton");
  if (newTabButton) {
    newTabButton.addEventListener("click", () => pickFileBtn.click());
  }
}

function renderAIResult(aiResultData) {
  if (!aiResultData) {
    aiResult.classList.add("hidden");
    resultTitle.textContent = "";
    resultContent.textContent = "";
    return;
  }

  resultTitle.textContent = aiResultData.title;
  resultTitle.style.color = aiResultData.isError ? "var(--danger)" : "";
  resultContent.innerHTML = escapeHtml(aiResultData.content).replace(/\n/g, "<br>");
  aiResult.classList.remove("hidden");
  aiResult.style.display = "block";
  aiResult.style.visibility = "visible";
  aiResult.style.opacity = "1";
  aiResult.style.height = "auto";
}

function renderTabError(tab) {
  fileName.textContent = tab.name;
  fileType.textContent = "HATA";
  fileInfo.classList.remove("hidden");
  emptyState.classList.add("hidden");
  preview.innerHTML = `
    <div class="file-preview-card">
      <div class="preview-header">
        <div class="preview-icon txt-icon">!</div>
        <div class="preview-meta">
          <h3>Dosya okunamadı</h3>
          <div class="preview-stats">
            <span class="stat-badge">${escapeHtml(tab.filePath)}</span>
          </div>
        </div>
      </div>
      <div class="preview-content">
        <div class="content-text">${escapeHtml(tab.error || "Bilinmeyen hata")}</div>
      </div>
    </div>
  `;
  aiResult.classList.add("hidden");
  updateEditorButtons();
}

function renderActiveTab() {
  syncActiveFileState();
  renderTabs();

  const activeTab = getActiveDocumentTab();
  if (addressField) {
    addressField.textContent = formatAddress(activeTab?.filePath);
    addressField.title = activeTab?.filePath || "Yeni sekme";
  }

  if (!activeTab) {
    hideLoading();
    fileInfo.classList.add("hidden");
    emptyState.classList.remove("hidden");
    aiResult.classList.add("hidden");
    updateEditorButtons();
    return;
  }

  if (activeTab.status === "loading") {
    fileInfo.classList.add("hidden");
    emptyState.classList.add("hidden");
    showLoading("Dosya okunuyor...");
    return;
  }

  hideLoading();

  if (activeTab.status === "error") {
    renderTabError(activeTab);
    return;
  }

  displayFile(activeTab.data, true, true);
  renderAIResult(activeTab.aiResult);
  updateEditorButtons();
}

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

function setSidebarCollapsed(collapsed) {
  if (!appRoot || !sidebar || !sidebarToggleBtn) return;
  appRoot.classList.toggle("sidebar-collapsed", collapsed);
  sidebar.classList.toggle("collapsed", collapsed);
  sidebarToggleBtn.setAttribute("aria-expanded", String(!collapsed));
  sidebarToggleBtn.title = collapsed ? "Sol paneli göster" : "Sol paneli gizle";
}

if (sidebarToggleBtn) {
  sidebarToggleBtn.addEventListener("click", () => {
    setSidebarCollapsed(!appRoot.classList.contains("sidebar-collapsed"));
  });
}

function setAIPanelCollapsed(collapsed) {
  if (!aiPanel || !aiPanelToggle) return;
  aiPanel.classList.toggle("collapsed", collapsed);
  aiPanelToggle.setAttribute("aria-expanded", String(!collapsed));
  aiPanelToggle.title = collapsed ? "AI panelini göster" : "AI panelini gizle";
}

if (aiPanelToggle) {
  aiPanelToggle.addEventListener("click", () => {
    setAIPanelCollapsed(!aiPanel.classList.contains("collapsed"));
  });
}

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

const batchHistoryActions = window.FilePeekActions?.createBatchHistoryActions?.({ addToHistory });

function updateHistoryUI() {
  const history = getFilteredHistory();
  const t = getCurrentTranslation();
  const pinnedPaths = new Set(getPinnedHistoryPaths());
  historyList.innerHTML = "";
  
  if (history.length === 0) {
    historyList.innerHTML = getEmptyHistoryMarkup();
    return;
  }
  
  history.forEach((item) => {
    const li = document.createElement("li");
    li.className = "history-item";
    if (pinnedPaths.has(item.path)) {
      li.classList.add("is-pinned");
    }
    const iconType = normalizeHistoryFileType(item.type);
    
    // Zaman formatı (örn: "2 saat önce", "Dün", "3 gün önce")
    const timeAgo = formatTimeAgo(item.date);
    
    // Dosya boyutu formatı (örn: "1.2 MB", "345 KB")
    const fileSize = item.size ? formatFileSize(item.size) : "";
    
    li.innerHTML = `
      <div class="history-item-icon" data-type="${iconType}">${getFileIcon(iconType)}</div>
      <div class="history-item-content">
        <div class="history-item-name">${escapeHtml(item.name)}</div>
        <div class="history-item-meta">
          ${fileSize ? `<span class="history-size">${fileSize}</span>` : ''}
          <span class="history-time">${timeAgo}</span>
        </div>
      </div>
      <button class="history-item-pin" type="button" title="${escapeHtml(pinnedPaths.has(item.path) ? t.unpinHistory : t.pinHistory)}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="m12 17-4 4v-7L4 9l7-5 7 5-4 5v7z"></path>
        </svg>
      </button>
      <button class="history-item-delete" onclick="event.stopPropagation(); removeFromHistoryByPath('${escapeAttribute(item.path)}');" title="${escapeHtml(t.removeFromHistory)}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      </button>
    `;

    li.querySelector(".history-item-pin")?.addEventListener("click", (event) => {
      event.stopPropagation();
      togglePinnedHistory(item.path);
    });
    li.addEventListener("click", () => openHistoryItem(item.path));
    historyList.appendChild(li);
  });
}

function normalizeHistoryFileType(type) {
  const normalized = String(type || "").toLowerCase();
  if (["xls", "xlsx"].includes(normalized)) return "xlsx";
  if (["doc", "docx"].includes(normalized)) return "docx";
  if (["txt", "text", "md", "csv"].includes(normalized)) return "txt";
  if (["jpg", "jpeg", "png", "gif", "webp", "bmp", "image"].includes(normalized)) return "image";
  if (normalized === "pdf") return "pdf";
  if (normalized === "zip") return "zip";
  if (normalized === "udf") return "udf";
  return "file";
}

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return "";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function renderZipEntryIcon(isFolder) {
  if (isFolder) {
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H10l2 2h6.5A2.5 2.5 0 0 1 21 9.5v7A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5v-9Z"></path></svg>`;
  }

  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h8l4 4v14H6z"></path><path d="M14 3v5h4M9 12h6M9 15h6M9 18h4"></path></svg>`;
}

function renderZipTree(entries = [], limit = 300) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return `<p class="zip-empty">Arşiv boş görünüyor.</p>`;
  }

  const visibleEntries = entries.slice(0, limit);
  return `
    <ul class="zip-tree">
      ${visibleEntries.map(entry => {
        const depth = Math.max(0, Number(entry.depth || 0));
        const sizeLabel = entry.isFolder ? "" : formatFileSize(entry.size);
        const displayName = entry.displayName || entry.name || entry.path || "Dosya";
        const pathLabel = entry.path || entry.name || displayName;

        return `
          <li class="zip-tree-item ${entry.isFolder ? "is-folder" : "is-file"}" style="--zip-depth: ${depth};" title="${escapeAttribute(pathLabel)}">
            <span class="zip-tree-icon">${renderZipEntryIcon(entry.isFolder)}</span>
            <span class="zip-tree-name">${escapeHtml(displayName)}</span>
            <span class="zip-tree-path">${escapeHtml(pathLabel)}</span>
            ${sizeLabel ? `<span class="zip-tree-size">${escapeHtml(sizeLabel)}</span>` : ""}
          </li>
        `;
      }).join("")}
    </ul>
  `;
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

function removeFromHistoryByPath(filePath) {
  let history = getFileHistory();
  const removedItem = history.find((item) => item.path === filePath);
  history = history.filter((item) => item.path !== filePath);
  localStorage.setItem("fileHistory", JSON.stringify(history));
  if (removedItem?.path) {
    savePinnedHistoryPaths(getPinnedHistoryPaths().filter((path) => path !== removedItem.path));
  }
  updateHistoryUI();
}

async function openHistoryItem(filePath) {
  const approvedPath = await window.kankaAPI.authorizeRecentFile(filePath);
  if (!approvedPath) {
    alert("Dosya bulunamadı veya erişim izni yenilenemedi.");
    return;
  }

  await loadFile(approvedPath);
}

// Global erişim için
window.removeFromHistoryByPath = removeFromHistoryByPath;

function getFileIcon(type) {
  const icon = (paths) => `<svg viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;
  const icons = {
    pdf: icon('<path d="M6 3h8l4 4v14H6z"></path><path d="M14 3v5h4M8 14h8M8 17h5"></path>'),
    docx: icon('<path d="M6 3h8l4 4v14H6z"></path><path d="M14 3v5h4M8 12h8M8 15h8M8 18h5"></path>'),
    xlsx: icon('<path d="M5 5h14v14H5z"></path><path d="M5 10h14M5 15h14M10 5v14M15 5v14"></path>'),
    zip: icon('<path d="M4 7h16v12H4z"></path><path d="M8 7V5h4l2 2M11 9v2M11 13v2"></path>'),
    text: icon('<path d="M6 3h12v18H6z"></path><path d="M9 8h6M9 12h6M9 16h4"></path>'),
    txt: icon('<path d="M6 3h12v18H6z"></path><path d="M9 8h6M9 12h6M9 16h4"></path>'),
    image: icon('<rect x="4" y="5" width="16" height="14" rx="2"></rect><path d="m7 16 4-4 3 3 2-2 3 3"></path><circle cx="9" cy="9" r="1.2"></circle>'),
    udf: icon('<path d="M12 3v18M7 7h10M6 11l-3 5h6l-3-5ZM18 11l-3 5h6l-3-5Z"></path>')
  };
  return icons[type] || icon('<path d="M6 3h8l4 4v14H6z"></path><path d="M14 3v5h4"></path>');
}

updateHistoryUI();
renderActiveTab();

if (historySearchInput) {
  historySearchInput.addEventListener("input", (event) => {
    historySearchTerm = String(event.target.value || "");
    updateHistoryUI();
  });
}

// Dosya seçme butonu
pickFileBtn.addEventListener("click", async () => {
  const filePath = await window.kankaAPI.pickFile();
  if (filePath) {
    await loadFile(filePath, false); // Manuel seçimde otomatik analiz yok
  }
});

if (toolbarOpenBtn) {
  toolbarOpenBtn.addEventListener("click", () => pickFileBtn.click());
}

if (emptyOpenBtn) {
  emptyOpenBtn.addEventListener("click", () => pickFileBtn.click());
}

if (toolbarReloadBtn) {
  toolbarReloadBtn.addEventListener("click", () => reloadActiveFile());
}

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
    const droppedPath = await window.kankaAPI.getDroppedFilePath(files[0]);
    if (droppedPath) {
      await loadFile(droppedPath);
    } else {
      pickFileBtn.click();
    }
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
  addToHistory(
    filePath,
    getFileNameFromPath(filePath),
    inferFileTypeFromPath(filePath),
    null
  );

  const opened = window.FilePeekTabs.openLoadingTab(tabState, filePath);
  tabState = opened.state;
  renderActiveTab();

  if (opened.reused) {
    hideLoading();
    if (autoAnalyze && currentFileData?.type === "image") {
      setTimeout(() => summaryBtn.click(), 500);
    }
    return;
  }
  
  try {
    const data = await window.kankaAPI.peekFile(filePath);
    
    if (data.error) {
      tabState = window.FilePeekTabs.setTabError(tabState, opened.tab.id, data.error);
      renderActiveTab();
      return;
    }
    
    data.fullPath = filePath;
    addToHistory(data.fullPath, data.name, data.type, data.size);
    tabState = window.FilePeekTabs.setTabReady(tabState, opened.tab.id, data);
    renderActiveTab();
    
    // Düzenle butonlarını güncelle
    updateEditorButtons();
    
    // Resimse ve autoAnalyze aktifse otomatik analiz başlat
    if (autoAnalyze && data.type === "image") {
      setTimeout(() => {
        summaryBtn.click();
      }, 500);
    }
    
  } catch (error) {
    tabState = window.FilePeekTabs.setTabError(tabState, opened.tab.id, `Hata: ${error.message}`);
    renderActiveTab();
  }
}

// Dosya görüntüleme
function displayFile(data, keepAIResult = false, skipHistory = false) {
  const previewType = getPreviewType(data);
  const previewText = getReadablePreviewText(data);
  clearSelectedPreviewContext();

  fileName.textContent = data.name;
  fileType.textContent = String(data.type || previewType).toUpperCase();
  
  fileInfo.classList.remove("hidden");
  emptyState.classList.add("hidden");
  
  // Toplu işlemde AI sonuçlarını gizleme
  if (!keepAIResult) {
    aiResult.classList.add("hidden");
  }
  
  // Geçmişe ekle (dosya yolu bilgisi varsa)
  if (data.fullPath && !skipHistory) {
    addToHistory(data.fullPath, data.name, data.type, data.size);
  }
  
  let previewHtml = "";
  
  switch (previewType) {
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
              PDF Önizleme
            </h4>
            <div class="pdf-page-controls" style="display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 14px;">
              <button id="pdf-prev-page" class="btn-secondary" type="button" style="min-width: 40px; padding: 8px 12px;" aria-label="Önceki sayfa">&larr;</button>
              <input id="pdf-page-input" type="number" min="1" max="${data.pages}" value="1" style="width: 64px; min-height: 36px; text-align: center; border: 1px solid var(--border); border-radius: 8px; background: var(--bg-primary); color: var(--text-primary); font-size: 13px; font-weight: 600;" aria-label="Sayfa numarası">
              <span id="pdf-page-indicator" style="min-width: 72px; text-align: center; font-size: 13px; font-weight: 600; color: var(--text-secondary);">1 / ${data.pages}</span>
              <button id="pdf-next-page" class="btn-secondary" type="button" style="min-width: 40px; padding: 8px 12px;" aria-label="Sonraki sayfa">&rarr;</button>
            </div>
            <div id="pdf-preview-loading" style="text-align: center; padding: 40px; color: var(--text-secondary);">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;">
                <circle cx="12" cy="12" r="10" opacity="0.25"></circle>
                <path d="M12 2a10 10 0 0 1 10 10" opacity="0.75"></path>
              </svg>
              <p style="margin-top: 16px;">PDF sayfasi yukleniyor...</p>
            </div>
            <div id="pdf-preview-container" style="text-align: center; display: none;"></div>
            <details style="margin-top: 20px;">
              <summary style="cursor: pointer; font-weight: 500; padding: 8px; background: var(--bg-secondary); border-radius: 6px;">Metin İçeriği</summary>
              <div class="content-text" style="margin-top: 12px;">${escapeHtml(previewText)}</div>
            </details>
          </div>
        </div>`;
      
      // PDF render et
      if (data.pdfData) {
        setTimeout(async () => {
          await setupPDFPreview(data.pdfData, 1);
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
            <div class="content-text">${escapeHtml(previewText)}</div>
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
                <span class="stat-badge">${data.totalSheets || data.sheets.length} Sayfa</span>
                <span class="stat-badge">${data.totalRows || '?'} Satır</span>
                <span class="stat-badge">${xlsxSizeMB} MB</span>
              </div>
              <p style="font-size: 11px; color: var(--text-muted); margin-top: 8px;">Sayfalar: ${data.sheets.join(", ")}</p>
            </div>
          </div>
          <div class="preview-content">
            ${tableHtml || `<div class="content-text">${escapeHtml(previewText)}</div>`}
          </div>
        </div>`;
      break;
      
    case "zip":
      previewHtml = `
        <div class="file-preview-card">
          <div class="preview-header">
            <div class="preview-icon txt-icon">ZIP</div>
            <div class="preview-meta">
              <h3>ZIP Arşivi</h3>
              <div class="preview-stats">
                <span class="stat-badge">${data.totalFiles} öğe</span>
              </div>
            </div>
          </div>
          <div class="preview-content">
            ${renderZipTree(data.entries || [], 300)}`;
      if (data.totalFiles > 300) {
        previewHtml += `<p class="zip-more">... ve ${data.totalFiles - 300} öğe daha</p>`;
      }
      previewHtml += `
            <div class="content-text" style="margin-top: 16px;">${escapeHtml(previewText)}</div>
          </div>
        </div>`;
      break;
      
    case "text":
      const txtSizeMB = data.size ? (data.size / 1024 / 1024).toFixed(2) : "?";
      const textTitle = data.type === "md" ? "Markdown Dosyası" : "Metin Dosyası";
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
              <h3>${textTitle}</h3>
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
            <div class="content-text">${escapeHtml(previewText)}</div>
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
            <div class="content-text" style="border-left: 3px solid #8B5CF6; font-family: 'Courier New', monospace;">${escapeHtml(previewText)}</div>
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

    default:
      previewHtml = `
        <div class="file-preview-card">
          <div class="preview-header">
            <div class="preview-icon txt-icon">?</div>
            <div class="preview-meta">
              <h3>Dosya Onizlemesi</h3>
              <div class="preview-stats">
                <span class="stat-badge">${escapeHtml(String(data.type || "BILINMEYEN").toUpperCase())}</span>
              </div>
            </div>
          </div>
          <div class="preview-content">
            <div class="content-text">${escapeHtml(previewText)}</div>
          </div>
        </div>`;
      break;
  }
  
  preview.innerHTML = previewHtml;
  renderFileQuickToolbar(data);

  if (!preview.dataset.selectionBound) {
    preview.addEventListener("mouseup", () => {
      window.requestAnimationFrame(() => updateSelectedPreviewContext());
    });
    preview.addEventListener("keyup", () => {
      window.requestAnimationFrame(() => updateSelectedPreviewContext());
    });
    preview.dataset.selectionBound = "true";
  }
  refreshActionButtons();
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
        showAIResult("Resim Betimleme", result.description);
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
    // Excel için özel mesaj
    const isExcel = currentFileData.type === "xlsx";
    const loadingMsg = isExcel 
      ? `AI ile analiz ediliyor (${currentFileData.totalSheets || 1} sayfa, ${currentFileData.totalRows || '?'} satır)...`
      : "AI ile özetleniyor (1. sayfa)...";
    
    showLoading(loadingMsg);
    aiResult.classList.add("hidden");
    
    try {
      // Batch için ham tüm metin yerine manifest, Excel için mevcut sample kullanılır.
      const text = currentFileData.isBatch && currentFileData.batchIndex
        ? currentFileData.batchIndex.summaryContext
        : currentFileData.sample || "";
      if (!text || text.trim().length === 0) {
        showError("Özetlenecek metin bulunamadı!");
        hideLoading();
        return;
      }
      const result = await window.kankaAPI.aiSummary(text);
      
      if (result.success) {
        const title = currentFileData.isBatch
          ? "Toplu Dosya Özeti"
          : isExcel ? "Excel Özeti (Tüm Sayfalar)" : "İlk Sayfa Özeti";
        showAIResult(title, result.summary);
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

let questionAudioStream = null;
let questionMediaRecorder = null;
let questionAudioChunks = [];
let questionAudioRecorder = null;
let questionRecordingFinalizing = false;
let questionStopTimer = null;
let browserSpeechRecognition = null;
let isQuestionListening = false;
let voiceAnswerPending = false;

function setVoiceQuestionListening(listening) {
  isQuestionListening = listening;
  if (!voiceQuestionBtn) return;
  voiceQuestionBtn.classList.toggle("listening", listening);
  voiceQuestionBtn.title = listening ? "Dinlemeyi durdur" : "Sesli soru sor";
  voiceQuestionBtn.setAttribute("aria-label", voiceQuestionBtn.title);
}

function speakAIAnswerIfNeeded(answer) {
  if (!voiceAnswerPending) return;
  voiceAnswerPending = false;
  speakText(answer);
}

function handleSuccessfulQuestionAnswer(title, answer) {
  showAIResult(title, answer);
  questionInput.value = "";
  speakAIAnswerIfNeeded(answer);
}

async function ensureMicrophoneAccess() {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Bu cihazda mikrofon erişimi desteklenmiyor.");
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      channelCount: 1,
    },
  });
  return stream;
}

function getSupportedVoiceMimeType() {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/ogg",
  ];

  return candidates.find(type => window.MediaRecorder?.isTypeSupported?.(type)) || "";
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = String(reader.result || "");
      resolve(result.includes(",") ? result.split(",")[1] : result);
    };
    reader.onerror = () => reject(reader.error || new Error("Ses verisi okunamadi."));
    reader.readAsDataURL(blob);
  });
}

function mergeFloat32Chunks(chunks) {
  const totalLength = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const merged = new Float32Array(totalLength);
  let offset = 0;

  chunks.forEach(chunk => {
    merged.set(chunk, offset);
    offset += chunk.length;
  });

  return merged;
}

function downsampleAudioBuffer(buffer, inputSampleRate, outputSampleRate) {
  if (inputSampleRate === outputSampleRate) {
    return buffer;
  }

  const ratio = inputSampleRate / outputSampleRate;
  const outputLength = Math.max(1, Math.round(buffer.length / ratio));
  const output = new Float32Array(outputLength);

  for (let i = 0; i < outputLength; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.min(Math.floor((i + 1) * ratio), buffer.length);
    let sum = 0;
    let count = 0;

    for (let j = start; j < end; j++) {
      sum += buffer[j];
      count++;
    }

    output[i] = count ? sum / count : 0;
  }

  return output;
}

function encodeWav(samples, sampleRate) {
  const bytesPerSample = 2;
  const blockAlign = bytesPerSample;
  const buffer = new ArrayBuffer(44 + samples.length * bytesPerSample);
  const view = new DataView(buffer);

  const writeString = (offset, value) => {
    for (let i = 0; i < value.length; i++) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples.length * bytesPerSample, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, samples.length * bytesPerSample, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const sample = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += bytesPerSample;
  }

  return buffer;
}

function createWavAudioBlob(chunks, inputSampleRate) {
  const targetSampleRate = 16000;
  const merged = mergeFloat32Chunks(chunks);
  const samples = downsampleAudioBuffer(merged, inputSampleRate, targetSampleRate);
  return new Blob([encodeWav(samples, targetSampleRate)], { type: "audio/wav" });
}

function createWavVoiceRecorder(stream) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    throw new Error("Bu cihazda WAV ses kaydı desteklenmiyor.");
  }

  const audioContext = new AudioContextClass();
  const source = audioContext.createMediaStreamSource(stream);
  const processor = audioContext.createScriptProcessor(4096, 1, 1);
  const chunks = [];

  processor.onaudioprocess = (event) => {
    chunks.push(new Float32Array(event.inputBuffer.getChannelData(0)));
    event.outputBuffer.getChannelData(0).fill(0);
  };

  source.connect(processor);
  processor.connect(audioContext.destination);

  return {
    async stop() {
      processor.disconnect();
      source.disconnect();
      await audioContext.close();
      return createWavAudioBlob(chunks, audioContext.sampleRate);
    },
  };
}

function cleanupVoiceQuestionSession() {
  if (questionStopTimer) {
    clearTimeout(questionStopTimer);
    questionStopTimer = null;
  }

  questionAudioStream?.getTracks().forEach(track => track.stop());
  questionAudioStream = null;
  questionMediaRecorder = null;
  questionAudioChunks = [];
  questionAudioRecorder = null;
  questionRecordingFinalizing = false;
}

function stopVoiceQuestionInput() {
  if (!isQuestionListening) return;
  setVoiceQuestionListening(false);
  questionInput.placeholder = getCurrentTranslation().askQuestion;

  if (questionAudioRecorder) {
    finalizeRecordedVoiceQuestionInput();
  } else if (browserSpeechRecognition) {
    browserSpeechRecognition.stop();
  } else if (questionMediaRecorder?.state === "recording") {
    questionMediaRecorder.stop();
  } else {
    cleanupVoiceQuestionSession();
  }
}

function getBrowserSpeechRecognitionConstructor() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function finishVoiceQuestionFromText(transcript) {
  const question = String(transcript || "").trim();
  if (!question) {
    voiceAnswerPending = false;
    alert("Ses yazıya çevrilemedi.");
    return;
  }

  questionInput.value = question;
  voiceAnswerPending = true;
  askBtn.click();
}

function startBrowserVoiceQuestionInput() {
  const SpeechRecognition = getBrowserSpeechRecognitionConstructor();
  if (!SpeechRecognition) return false;

  let finalTranscript = "";
  let browserSpeechHadError = false;
  browserSpeechRecognition = new SpeechRecognition();
  browserSpeechRecognition.lang = "tr-TR";
  browserSpeechRecognition.continuous = false;
  browserSpeechRecognition.interimResults = true;
  browserSpeechRecognition.maxAlternatives = 1;

  browserSpeechRecognition.addEventListener("result", (event) => {
    let interimTranscript = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i]?.[0]?.transcript || "";
      if (event.results[i].isFinal) {
        finalTranscript += transcript;
      } else {
        interimTranscript += transcript;
      }
    }
    questionInput.value = (finalTranscript || interimTranscript).trim();
  });

  browserSpeechRecognition.addEventListener("error", (event) => {
    browserSpeechHadError = true;
    const shouldUseRecordedFallback = event.error === "network";
    voiceAnswerPending = false;
    cleanupVoiceQuestionSession();
    setVoiceQuestionListening(false);
    browserSpeechRecognition = null;
    questionInput.placeholder = getCurrentTranslation().askQuestion;

    if (shouldUseRecordedFallback) {
      console.warn("Tarayıcı ses tanıma ağ hatası verdi, kayıt tabanlı transkripsiyona geçiliyor.", event);
      startRecordedVoiceQuestionInput().catch((error) => {
        voiceAnswerPending = false;
        cleanupVoiceQuestionSession();
        setVoiceQuestionListening(false);
        hideLoading();
        console.error("Sesli soru fallback başlatılamadı:", error);
        alert(error.message || "Sesli soru başlatılamadı.");
      });
      return;
    }

    alert(event.error ? `Ses tanıma hatası: ${event.error}` : "Ses tanıma başlatılamadı.");
  });

  browserSpeechRecognition.addEventListener("end", () => {
    if (browserSpeechHadError) {
      return;
    }
    const transcript = finalTranscript || questionInput.value;
    const shouldFinish = isQuestionListening;
    cleanupVoiceQuestionSession();
    setVoiceQuestionListening(false);
    browserSpeechRecognition = null;
    questionInput.placeholder = getCurrentTranslation().askQuestion;

    if (shouldFinish) {
      finishVoiceQuestionFromText(transcript);
    }
  });

  browserSpeechRecognition.start();
  voiceQuestionBtn.classList.remove("loading");
  setVoiceQuestionListening(true);
  questionInput.placeholder = "Dinleniyor... bitirmek için mikrofona tekrar basın";

  questionStopTimer = setTimeout(() => {
    if (isQuestionListening) {
      stopVoiceQuestionInput();
    }
  }, 20000);

  return true;
}

async function startRecordedVoiceQuestionInput() {
  questionAudioStream = await ensureMicrophoneAccess();
  questionAudioRecorder = createWavVoiceRecorder(questionAudioStream);
  voiceQuestionBtn.classList.remove("loading");
  setVoiceQuestionListening(true);
  questionInput.placeholder = "Dinleniyor... bitirmek için mikrofona tekrar basın";

  questionStopTimer = setTimeout(() => {
    if (isQuestionListening) {
      stopVoiceQuestionInput();
    }
  }, 20000);
}

async function finalizeRecordedVoiceQuestionInput() {
  if (!questionAudioRecorder || questionRecordingFinalizing) return;

  const recorder = questionAudioRecorder;
  questionAudioRecorder = null;
  questionRecordingFinalizing = true;

  if (questionStopTimer) {
    clearTimeout(questionStopTimer);
    questionStopTimer = null;
  }

  setVoiceQuestionListening(false);
  questionInput.placeholder = getCurrentTranslation().askQuestion;

  try {
    showLoading("Ses yazıya çevriliyor...");
    const audioBlob = await recorder.stop();
    cleanupVoiceQuestionSession();
    const base64Audio = await blobToBase64(audioBlob);
    const result = await window.kankaAPI.aiTranscribeAudio(base64Audio, "audio/wav");

    if (result.success) {
      finishVoiceQuestionFromText(result.transcript);
    } else {
      voiceAnswerPending = false;
      const installHint = result.needsLocalSTTInstall
        ? " Ayarlar > Lokal Ses Tanıma bölümünden whisper.cpp kurun."
        : "";
      alert(`${result.error || "Ses yazıya çevrilemedi."}${installHint}`);
    }
  } catch (error) {
    voiceAnswerPending = false;
    cleanupVoiceQuestionSession();
    console.error("Ses yazıya çevirme hatası:", error);
    alert(error.message || "Ses yazıya çevrilemedi.");
  } finally {
    hideLoading();
    questionInput.placeholder = getCurrentTranslation().askQuestion;
  }
}

async function startVoiceQuestionInput() {
  if (!voiceQuestionBtn) return;

  if (!currentFileData) {
    alert("Önce bir dosya açın.");
    return;
  }

  if (isQuestionListening) {
    stopVoiceQuestionInput();
    return;
  }

  try {
    await startRecordedVoiceQuestionInput();
  } catch (error) {
    if (startBrowserVoiceQuestionInput()) {
      return;
    }

    voiceAnswerPending = false;
    cleanupVoiceQuestionSession();
    setVoiceQuestionListening(false);
    voiceQuestionBtn.classList.remove("loading");
    hideLoading();
    questionInput.placeholder = getCurrentTranslation().askQuestion;
    console.error("Sesli soru başlatılamadı:", error);
    alert(error.message || "Sesli soru başlatılamadı.");
  }
}

if (voiceQuestionBtn) {
  voiceQuestionBtn.addEventListener("click", startVoiceQuestionInput);
}

if (askSelectionBtn) {
  askSelectionBtn.addEventListener("click", () => {
    if (!selectedPreviewContext) {
      updateSelectedPreviewContext();
    }
    setQuestionContextScope("selection");
    updateQuestionContextScopeUI();
    questionInput.focus();
  });
}

questionContextScopeSelect?.addEventListener("change", (event) => {
  setQuestionContextScope(event.target.value);
  updateQuestionContextScopeUI();
});

if (selectionMailBtn) {
  selectionMailBtn.addEventListener("click", () => {
    openMailDraftModalFromSelection();
  });
}

if (selectionCalendarBtn) {
  selectionCalendarBtn.addEventListener("click", () => {
    openCalendarDraftModalFromSelection();
  });
}

selectionMailGenerateBtn?.addEventListener("click", async () => {
  try {
    showLoading("Gmail taslağı hazırlanıyor...");
    await requestMailDraftFromSelection();
  } catch (error) {
    showError(error.message || "Mail taslağı hazırlanamadı.");
  } finally {
    hideLoading();
  }
});

selectionCalendarGenerateBtn?.addEventListener("click", async () => {
  try {
    showLoading("Takvim taslağı hazırlanıyor...");
    await requestCalendarDraftFromSelection();
  } catch (error) {
    showError(error.message || "Takvim taslağı hazırlanamadı.");
  } finally {
    hideLoading();
  }
});

if (clearSelectionContextBtn) {
  clearSelectionContextBtn.addEventListener("click", () => {
    clearSelectedPreviewContext();
  });
}

[selectionMailModal, selectionCalendarModal].forEach((modal) => {
  modal?.addEventListener("click", (event) => {
    if (event.target === modal) {
      closeModal(modal);
    }
  });
});

closeSelectionMailModal?.addEventListener("click", () => closeModal(selectionMailModal));
cancelSelectionMailBtn?.addEventListener("click", () => closeModal(selectionMailModal));
closeSelectionCalendarModal?.addEventListener("click", () => closeModal(selectionCalendarModal));
cancelSelectionCalendarBtn?.addEventListener("click", () => closeModal(selectionCalendarModal));

openSelectionMailDraftBtn?.addEventListener("click", async () => {
  const params = new URLSearchParams({
    view: "cm",
    fs: "1",
    to: selectionMailToInput?.value?.trim() || "",
    su: selectionMailSubjectInput?.value?.trim() || "",
    body: selectionMailBodyInput?.value?.trim() || "",
  });
  const gmailUrl = `https://mail.google.com/mail/?${params.toString()}`;
  try {
    await openExternalUrl(gmailUrl);
    closeModal(selectionMailModal);
  } catch (error) {
    showError(error.message || "Gmail taslağı açılamadı.");
  }
});

openSelectionCalendarDraftBtn?.addEventListener("click", async () => {
  const dateValue = selectionCalendarDateInput?.value;
  const startTime = selectionCalendarStartInput?.value || "09:00";
  const endTime = selectionCalendarEndInput?.value || "10:00";
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: selectionCalendarTitleInput?.value?.trim() || "",
    dates: `${formatGoogleCalendarDate(dateValue, startTime)}/${formatGoogleCalendarDate(dateValue, endTime)}`,
    details: selectionCalendarDetailsInput?.value?.trim() || "",
  });
  const calendarUrl = `https://calendar.google.com/calendar/render?${params.toString()}`;
  try {
    await openExternalUrl(calendarUrl);
    closeModal(selectionCalendarModal);
  } catch (error) {
    showError(error.message || "Takvim taslağı açılamadı.");
  }
});

if (fileQuickToolbar) {
  fileQuickToolbar.addEventListener("click", (event) => {
    const actionButton = event.target.closest("[data-action]");
    if (!actionButton) return;

    const action = actionButton.dataset.action;
    if (action === "summarize") summaryBtn.click();
    if (action === "translate") translateBtn.click();
    if (action === "read") speakBtn.click();
    if (action === "ask") questionInput.focus();
    if (action === "edit" && currentFileData?.type === "docx") document.getElementById("editWordBtn")?.click();
    if (action === "edit" && currentFileData?.type === "xlsx") document.getElementById("editExcelBtn")?.click();
    if (action === "preview") preview.scrollIntoView({ behavior: "smooth", block: "start" });
    if (action === "text") preview.querySelector("details")?.setAttribute("open", "open");
  });
}

// Soru sorma butonu
askBtn.addEventListener("click", async () => {
  const question = questionInput.value.trim();
  if (!question || !currentFileData) return;
  
  // Excel için özel loading mesajı
  const isExcel = currentFileData.type === "xlsx";
  const loadingMsg = isExcel 
    ? `Excel satırları yerelde aranıyor, sonra AI yanıt hazırlıyor (${currentFileData.totalRows || '?'} satır)...`
    : "AI cevap hazırlıyor...";
  
  showLoading(loadingMsg);
  aiResult.classList.add("hidden");
  
  try {
    // Resim ise resim soru-cevap
    if (currentFileData.type === "image") {
      const result = await window.kankaAPI.aiImageQuestion(currentFileData.base64, currentFileData.mimeType, question);
      
      if (result.success) {
        handleSuccessfulQuestionAnswer(`Soru: "${question}"`, result.answer);
      } else {
        showError(result.error);
        voiceAnswerPending = false;
      }
    } 
    // Metin/belge ise normal soru-cevap
    else {
      const questionContext = getQuestionContextText(question);
      const text = questionContext;

      if (!text || text.trim().length === 0) {
        showError("Soru sorulacak metin bulunamadı!");
        voiceAnswerPending = false;
        hideLoading();
        return;
      }
      const result = await window.kankaAPI.aiQuestion(text, question);
      
      if (result.success) {
        handleSuccessfulQuestionAnswer(`Soru: "${question}"`, result.answer);
        clearSelectedPreviewContext();
      } else {
        showError(result.error);
        voiceAnswerPending = false;
      }
    }
  } catch (error) {
    voiceAnswerPending = false;
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
  const activeTab = getActiveDocumentTab();
  if (activeTab) {
    tabState = window.FilePeekTabs.setTabAIResult(tabState, activeTab.id, lastAIResult);
    renderTabs();
  }
  
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
  lastAIResult = { title: "Hata", content: message, isError: true };
  const activeTab = getActiveDocumentTab();
  if (activeTab) {
    tabState = window.FilePeekTabs.setTabAIResult(tabState, activeTab.id, lastAIResult);
    renderTabs();
  }
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

function escapeAttribute(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
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

function speakText(textSource) {
  // Eğer konuşma devam ediyorsa durdur
  if (speechSynthesis.speaking) {
    speechSynthesis.cancel();
    refreshActionButtons();
    return false;
  }
  
  if (!textSource || textSource.length === 0) {
    alert("Okunacak metin bulunamadı!");
    return false;
  }

  const textToSpeak = textSource.slice(0, 5000); // İlk 5000 karakter
  
  currentUtterance = new SpeechSynthesisUtterance(textToSpeak);
  currentUtterance.lang = 'tr-TR';
  currentUtterance.rate = 1.0;
  currentUtterance.pitch = 1.0;
  
  currentUtterance.onstart = () => {
    refreshActionButtons();
  };
  
  currentUtterance.onend = () => {
    refreshActionButtons();
  };
  
  speechSynthesis.speak(currentUtterance);
  return true;
}

speakBtn.addEventListener("click", () => {
  // AI sonucu varsa onu oku, yoksa dosya içeriğini oku
  const textSource = lastAIResult ? lastAIResult.content : (currentFileData ? (currentFileData.fullText || currentFileData.sample) : null);
  speakText(textSource);
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

function setAIStatus(message, tone = "info") {
  if (!aiSettingsStatus) return;
  aiSettingsStatus.textContent = message;
  aiSettingsStatus.dataset.tone = tone;
}

function setLocalSTTStatus(message, tone = "info") {
  if (!localSTTStatus) return;
  localSTTStatus.textContent = message;
  localSTTStatus.dataset.tone = tone;
}

function renderLocalSTTStatus(status) {
  if (!status) {
    setLocalSTTStatus("Lokal ses tanıma durumu alınamadı.", "error");
    return;
  }

  if (status.ready) {
    setLocalSTTStatus(`Hazır: whisper.cpp + ${status.modelFile}`, "success");
    if (localSTTInstallBtn) {
      localSTTInstallBtn.textContent = "Yeniden Kur";
    }
    return;
  }

  const missing = Array.isArray(status.missing) && status.missing.length
    ? status.missing.join(", ")
    : "kurulum";
  setLocalSTTStatus(`Eksik: ${missing}. Sesli soru için whisper.cpp kurulmalı.`, "warning");
  if (localSTTInstallBtn) {
    localSTTInstallBtn.textContent = "whisper.cpp Kur";
  }
}

async function loadLocalSTTStatus() {
  if (!window.kankaAPI?.getLocalSTTStatus) return;

  try {
    const status = await window.kankaAPI.getLocalSTTStatus();
    renderLocalSTTStatus(status);
  } catch (error) {
    setLocalSTTStatus(error.message || "Lokal ses tanıma durumu alınamadı.", "error");
  }
}

async function installLocalSTT() {
  if (!window.kankaAPI?.installLocalSTT || !localSTTInstallBtn) return;

  localSTTInstallBtn.disabled = true;
  setLocalSTTStatus("whisper.cpp ve ggml-small.bin indiriliyor...", "info");

  try {
    const result = await window.kankaAPI.installLocalSTT();
    if (!result.success) {
      throw new Error(result.error || "Lokal ses tanıma kurulamadı");
    }
    renderLocalSTTStatus(result.status);
  } catch (error) {
    setLocalSTTStatus(error.message || "Lokal ses tanıma kurulamadı.", "error");
  } finally {
    localSTTInstallBtn.disabled = false;
  }
}

function setProviderStatus(providerId, message, tone = "info") {
  const fields = aiProviderFields[providerId];
  if (!fields?.statusNode) return;
  fields.statusNode.textContent = message;
  fields.statusNode.dataset.tone = tone;
}

function updateProviderCardState() {
  providerCards.forEach(card => {
    card.classList.toggle("is-active", card.dataset.provider === aiProviderSelect?.value);
  });
}

function getProviderOverrides(providerId) {
  const fields = aiProviderFields[providerId];
  if (!fields) return {};

  const overrides = {
    baseUrl: fields.baseUrlInput?.value?.trim(),
    model: fields.textModelSelect?.value?.trim(),
    visionModel: fields.visionModelSelect?.value?.trim(),
  };

  if (fields.apiKeyInput?.value?.trim()) {
    overrides.apiKey = fields.apiKeyInput.value.trim();
  }

  return overrides;
}

function updateProviderKeyHint(providerId, providerSettings) {
  const fields = aiProviderFields[providerId];
  if (!fields?.apiKeyHint) return;

  const t = getCurrentTranslation();
  if (providerSettings?.apiKeySet && providerSettings?.apiKeyMasked) {
    fields.apiKeyHint.textContent = `${t.savedKeyPresent}${providerSettings.apiKeyMasked}`;
    if (fields.apiKeyInput && !fields.apiKeyInput.value) {
      fields.apiKeyInput.placeholder = `${t.savedKeyPlaceholder} ${providerSettings.apiKeyMasked}`;
    }
  } else if (providerId === "ollama") {
    fields.apiKeyHint.textContent = t.ollamaOptionalKey;
    if (fields.apiKeyInput && !fields.apiKeyInput.value) {
      fields.apiKeyInput.placeholder = "ollama cloud için";
    }
  } else {
    fields.apiKeyHint.textContent = t.savedKeyMissing;
    if (fields.apiKeyInput && !fields.apiKeyInput.value) {
      fields.apiKeyInput.placeholder = providerId === "gemini"
        ? "AIza..."
        : providerId === "anthropic"
          ? "sk-ant-..."
          : providerId === "openrouter"
            ? "sk-or-..."
            : "sk-...";
    }
  }
}

function populateModelSelect(select, models, selectedValue) {
  if (!select) return;

  const list = Array.isArray(models) ? models : [];
  const currentValue = selectedValue || select.value || "";
  const options = list.length
    ? list.map(model => {
        const label = model.supportsVision ? `${model.label} · Vision` : model.label;
        return `<option value="${escapeHtml(model.id)}">${escapeHtml(label)}</option>`;
      }).join("")
    : "";

  if (options) {
    select.innerHTML = options;
  } else {
    select.innerHTML = "";
  }

  if (currentValue && !list.some(model => model.id === currentValue)) {
    const fallback = document.createElement("option");
    fallback.value = currentValue;
    fallback.textContent = currentValue;
    select.appendChild(fallback);
  }

  if (!select.value && select.options.length) {
    select.selectedIndex = 0;
  }

  if (currentValue) {
    select.value = currentValue;
  }
}

function applyAISettingsToForm(settings) {
  if (!settings) return;

  aiSettingsState = settings;
  aiProviderSelect.value = settings.activeProvider || "openai";

  AI_PROVIDER_IDS.forEach(providerId => {
    const fields = aiProviderFields[providerId];
    const provider = settings.providers?.[providerId] || {};

    if (!fields) return;
    if (fields.baseUrlInput) fields.baseUrlInput.value = provider.baseUrl || "";
    if (fields.customTextModelInput) fields.customTextModelInput.value = provider.model || "";
    if (fields.customVisionModelInput) fields.customVisionModelInput.value = provider.visionModel || "";
    if (fields.apiKeyInput) {
      fields.apiKeyInput.value = "";
      fields.apiKeyInput.dataset.clear = "false";
    }

    updateProviderKeyHint(providerId, provider);
    populateModelSelect(fields.textModelSelect, aiModelCache[providerId], provider.model);
    populateModelSelect(fields.visionModelSelect, aiModelCache[providerId], provider.visionModel);

    if (providerId === "ollama" && fields.pullInput) {
      fields.pullInput.placeholder = getCurrentTranslation().ollamaPullPlaceholder;
    }
    setProviderStatus(providerId, getCurrentTranslation().readyStatus);
  });

  updateProviderCardState();
}

async function loadAISettings() {
  try {
    const settings = await window.kankaAPI.getAISettings();
    applyAISettingsToForm(settings);
    setAIStatus(getCurrentTranslation().aiSettingsIdle);
  } catch (error) {
    setAIStatus(error.message || "AI ayarları yüklenemedi.", "error");
  }
}

function collectAISettingsPayload() {
  const payload = {
    activeProvider: aiProviderSelect.value,
    providers: {},
  };

  AI_PROVIDER_IDS.forEach(providerId => {
    const fields = aiProviderFields[providerId];
    if (!fields) return;

    const nextProvider = {
      baseUrl: fields.baseUrlInput?.value?.trim() || "",
      model: fields.customTextModelInput?.value?.trim() || fields.textModelSelect?.value?.trim() || "",
      visionModel: fields.customVisionModelInput?.value?.trim() || fields.visionModelSelect?.value?.trim() || "",
    };

    if (fields.apiKeyInput?.dataset.clear === "true") {
      nextProvider.clearApiKey = true;
    } else if (fields.apiKeyInput?.value?.trim()) {
      nextProvider.apiKey = fields.apiKeyInput.value.trim();
    }

    payload.providers[providerId] = nextProvider;
  });

  return payload;
}

async function refreshProviderModels(providerId) {
  const result = await window.kankaAPI.listAIModels(providerId, getProviderOverrides(providerId));
  if (!result.success) {
    throw new Error(result.error || "Model listesi alınamadı");
  }

  aiModelCache[providerId] = result.models || [];
  const fields = aiProviderFields[providerId];
  populateModelSelect(fields.textModelSelect, aiModelCache[providerId], fields.textModelSelect.value);
  populateModelSelect(fields.visionModelSelect, aiModelCache[providerId], fields.visionModelSelect.value);

  if (!aiModelCache[providerId].length) {
    setAIStatus(getCurrentTranslation().noModelsFound, "warning");
    setProviderStatus(providerId, getCurrentTranslation().noModelsFound, "warning");
  } else {
    setAIStatus(`${PROVIDER_LABELS[providerId]}: ${getCurrentTranslation().modelsLoaded}`, "success");
    setProviderStatus(providerId, getCurrentTranslation().modelsLoaded, "success");
  }
}

async function testProviderConnection(providerId) {
  const result = await window.kankaAPI.testAIProvider(providerId, getProviderOverrides(providerId));
  if (!result.success) {
    throw new Error(result.error || "Bağlantı testi başarısız");
  }

  const t = getCurrentTranslation();
  setAIStatus(`${PROVIDER_LABELS[providerId]}: ${t.connectionSuccess} (${result.result.modelCount})`, "success");
  setProviderStatus(providerId, `${t.connectionSuccess} (${result.result.modelCount})`, "success");
}

async function saveAISettings() {
  const activeProvider = aiProviderSelect?.value || "openai";
  const response = await window.kankaAPI.saveAISettings(collectAISettingsPayload());
  if (!response.success) {
    throw new Error(response.error || "AI ayarları kaydedilemedi");
  }

  applyAISettingsToForm(response.settings);
  setAIStatus(getCurrentTranslation().aiSettingsSaved, "success");
  setProviderStatus(activeProvider, getCurrentTranslation().aiSettingsSaved, "success");
}

async function pullOllamaModel() {
  const fields = aiProviderFields.ollama;
  const modelName = fields.pullInput?.value?.trim();
  if (!modelName) {
    setAIStatus(getCurrentTranslation().ollamaPullPlaceholder, "warning");
    return;
  }

  const result = await window.kankaAPI.pullOllamaModel({
    modelName,
    baseUrl: fields.baseUrlInput?.value?.trim(),
  });

  if (!result.success) {
    throw new Error(result.error || "Model indirilemedi");
  }

  await refreshProviderModels("ollama");
  fields.pullInput.value = "";
}

// Ayarlar paneli
settingsBtn.addEventListener("click", () => {
  loadAISettings();
  loadLocalSTTStatus();
  settingsModal.classList.remove("hidden");
});

if (toolbarSettingsBtn) {
  toolbarSettingsBtn.addEventListener("click", () => {
    loadAISettings();
    loadLocalSTTStatus();
    settingsModal.classList.remove("hidden");
  });
}

if (localSTTInstallBtn) {
  localSTTInstallBtn.addEventListener("click", installLocalSTT);
  loadLocalSTTStatus();
}

closeSettings.addEventListener("click", () => {
  settingsModal.classList.add("hidden");
});

settingsModal.addEventListener("click", (e) => {
  if (e.target === settingsModal) {
    settingsModal.classList.add("hidden");
  }
});

if (aiProviderSelect) {
  aiProviderSelect.addEventListener("change", () => {
    updateProviderCardState();
  });
}

if (saveAISettingsBtn) {
  saveAISettingsBtn.addEventListener("click", async () => {
    try {
      await saveAISettings();
    } catch (error) {
      setAIStatus(error.message || "AI ayarları kaydedilemedi", "error");
    }
  });
}

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

AI_PROVIDER_IDS.forEach((providerId) => {
  const fields = aiProviderFields[providerId];
  if (!fields) return;

  fields.refreshButton?.addEventListener("click", async () => {
    try {
      setAIStatus(`${PROVIDER_LABELS[providerId]} modelleri yükleniyor...`);
      setProviderStatus(providerId, "Yükleniyor...", "info");
      await refreshProviderModels(providerId);
    } catch (error) {
      setAIStatus(error.message || "Model listesi alınamadı", "error");
      setProviderStatus(providerId, error.message || "Model listesi alınamadı", "error");
    }
  });

  fields.testButton?.addEventListener("click", async () => {
    try {
      setAIStatus(`${PROVIDER_LABELS[providerId]} bağlantısı test ediliyor...`);
      setProviderStatus(providerId, "Bağlantı test ediliyor...", "info");
      await testProviderConnection(providerId);
    } catch (error) {
      setAIStatus(error.message || "Bağlantı testi başarısız", "error");
      setProviderStatus(providerId, error.message || "Bağlantı testi başarısız", "error");
    }
  });

  fields.clearKeyButton?.addEventListener("click", () => {
    if (fields.apiKeyInput) {
      fields.apiKeyInput.value = "";
      fields.apiKeyInput.dataset.clear = "true";
      updateProviderKeyHint(providerId, { apiKeySet: false, apiKeyMasked: "" });
      setAIStatus(`${PROVIDER_LABELS[providerId]} anahtarı kaydedildiğinde temizlenecek.`, "warning");
      setProviderStatus(providerId, "Anahtar kaydedildiğinde temizlenecek.", "warning");
    }
  });

  fields.apiKeyInput?.addEventListener("input", () => {
    fields.apiKeyInput.dataset.clear = "false";
  });

  fields.textModelSelect?.addEventListener("change", () => {
    if (fields.customTextModelInput && fields.textModelSelect.value) {
      fields.customTextModelInput.value = fields.textModelSelect.value;
    }
  });

  fields.visionModelSelect?.addEventListener("change", () => {
    if (fields.customVisionModelInput && fields.visionModelSelect.value) {
      fields.customVisionModelInput.value = fields.visionModelSelect.value;
    }
  });
});

aiProviderFields.ollama.pullButton?.addEventListener("click", async () => {
  try {
    setAIStatus("Ollama modeli indiriliyor...");
    await pullOllamaModel();
  } catch (error) {
    setAIStatus(error.message || "Ollama modeli indirilemedi", "error");
  }
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
        allFilesContent.push(`\n${fileName}\nHata: ${data.error}`);
        errorCount++;
        continue;
      }
      
      const text = data.fullText || data.sample;
      if (!text || text.trim().length === 0) {
        allFilesContent.push(`\n${fileName}\nHata: Dosya içeriği boş`);
        errorCount++;
        continue;
      }

      if (batchHistoryActions) {
        batchHistoryActions.addReadFileToHistory(filePath, data);
      } else {
        addToHistory(filePath, data.name || fileName, data.type, data.size);
      }
      
      // Dosya içeriğini listeye ekle (Excel ve UDF için özel format)
      if (data.type === 'xlsx' && data.rows && data.rows.length > 0) {
        // Excel dosyası - tablo olarak ekle
        let excelHtml = `<div style="margin-bottom: 30px;">`;
        excelHtml += `<h3 style="color: var(--primary); margin-bottom: 10px;">${fileName}</h3>`;
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
        udfHtml += `<h3 style="color: #8B5CF6; margin-bottom: 10px;">${fileName}</h3>`;
        udfHtml += `<div style="padding: 12px; background: rgba(139, 92, 246, 0.05); border-left: 3px solid #8B5CF6; border-radius: 8px; white-space: pre-wrap; font-family: monospace; font-size: 12px; max-height: 400px; overflow-y: auto;">`;
        udfHtml += escapeHtml(text.substring(0, 2000)) + (text.length > 2000 ? "\n..." : "");
        udfHtml += `</div></div>`;
        allFilesContent.push(udfHtml);
      } else {
        // Diğer dosyalar - metin olarak ekle
        allFilesContent.push(`\n${fileName}\n${"-".repeat(60)}\n${text.substring(0, 1000)}${text.length > 1000 ? "\n..." : ""}`);
      }
      
      allFilesData.push({ fileName, data, text });
      successCount++;
      
      console.log(`Dosya okundu: ${fileName}`);
      
    } catch (error) {
      console.error(`İşlem hatası: ${fileName}`, error);
      allFilesContent.push(`\n${fileName}\nHata: ${error.message}`);
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
    const batchIndexCandidate = window.FilePeekActions?.createBatchDocumentIndex
      ? window.FilePeekActions.createBatchDocumentIndex(allFilesData)
      : null;
    const batchIndex = batchIndexCandidate?.documents?.length ? batchIndexCandidate : null;
    const batchSummaryContext = batchIndex?.summaryContext || allTexts.substring(0, 2000);
    
    // Global değişkene kaydet (Özetle/Sor butonları kullanacak)
    currentFileData = {
      name: `${allFilesData.length} Dosya`,
      type: "toplu",
      fullText: allTexts,
      sample: batchSummaryContext,
      isBatch: true,
      batchIndex,
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
    `${successCount} Dosya Hazır`,
    `Toplu işlem tamamlandı!\n\n${successCount} dosya başarıyla okundu\n${errorCount > 0 ? `${errorCount} dosya hatalı\n` : ''}\nAnaliz yapmak için "Özetle" veya "Sor" butonuna basın.`
  );
});

// Dil değiştirme
function updateLanguage(lang) {
  if (!translations[lang]) {
    lang = "tr";
  }
  currentLang = lang;
  localStorage.setItem("appLang", lang);
  langText.textContent = lang.toUpperCase();
  if (toolbarLangText) {
    toolbarLangText.textContent = lang.toUpperCase();
  }
  
  // Ayarlar modalındaki select'i de güncelle
  langSelect.value = lang;
  
  const t = translations[lang];
  
  // Butonları güncelle
  pickFileBtn.innerHTML = `<span class="btn-icon">+</span> ${t.pickFile}`;
  batchBtn.innerHTML = `<span class="btn-icon">=</span> ${t.batchProcess}`;
  document.querySelector(".subtitle").textContent = t.subtitle;
  if (uploadPanelTitle) uploadPanelTitle.textContent = t.uploadSection;
  if (dropZoneLabel) dropZoneLabel.textContent = t.dragDrop;
  if (recentFilesTitle) recentFilesTitle.textContent = t.recentFiles;
  if (historySearchInput) historySearchInput.placeholder = t.historySearch;
  if (clearRecentFilesBtn) {
    clearRecentFilesBtn.title = t.clearHistory;
    clearRecentFilesBtn.setAttribute("aria-label", t.clearHistory);
  }
  if (infoFooterLabel) infoFooterLabel.textContent = t.privacyNote;
  questionInput.placeholder = shouldUseSelectedContextForQuestion() ? t.selectionQuestionPlaceholder : t.askQuestion;
  if (selectedContextBar && selectedContextText) {
    const selectedContextLabel = selectedContextBar.querySelector(".selected-context-label");
    if (selectedContextLabel) selectedContextLabel.textContent = t.selectedContext;
  }
  const selectedContextScopeLabel = selectedContextBar?.querySelector(".selected-context-scope-label");
  if (selectedContextScopeLabel) selectedContextScopeLabel.textContent = t.selectionScopeLabel;
  if (questionContextScopeSelect) {
    const selectionOption = questionContextScopeSelect.querySelector('option[value="selection"]');
    const documentOption = questionContextScopeSelect.querySelector('option[value="document"]');
    if (selectionOption) selectionOption.textContent = t.selectionScopeSelection;
    if (documentOption) documentOption.textContent = t.selectionScopeDocument;
  }
  if (askSelectionBtn) askSelectionBtn.textContent = t.askSelection;
  if (selectionMailBtn) selectionMailBtn.textContent = t.sendAsMail;
  if (selectionCalendarBtn) selectionCalendarBtn.textContent = t.addToCalendar;
  updateQuestionContextScopeUI();
  refreshActionButtons();
  renderFileQuickToolbar(currentFileData);
  
  // Ayarlar modalını güncelle
  document.querySelector("#settingsModal h2").textContent = t.settings;
  if (settingsKicker) settingsKicker.textContent = t.settingsKicker;
  if (settingsLead) settingsLead.textContent = t.settingsLead;
  if (appearanceSettingsTitle) appearanceSettingsTitle.textContent = t.appearance;
  if (generalSettingsTitle) generalSettingsTitle.textContent = t.general;
  if (aiSettingsTitle) aiSettingsTitle.textContent = t.aiSettings;
  if (aboutSettingsTitle) aboutSettingsTitle.textContent = t.about;
  
  // Ayarlar etiketleri
  if (themeModeLabel) themeModeLabel.textContent = t.themeMode;
  if (colorThemeLabel) colorThemeLabel.textContent = t.colorTheme;
  if (languageLabel) languageLabel.textContent = t.language;
  if (fileHistoryLabel) fileHistoryLabel.textContent = t.fileHistory;
  const aiProviderLabel = document.getElementById("aiProviderLabel");
  if (aiProviderLabel) aiProviderLabel.textContent = t.aiProvider;
  if (saveAISettingsBtn) saveAISettingsBtn.textContent = t.saveAISettings;
  
  // Tema butonları
  lightThemeBtn.querySelector("span").textContent = t.light;
  darkThemeBtn.querySelector("span").textContent = t.dark;
  
  // Temizle butonu
  if (clearHistoryBtn) {
    clearHistoryBtn.innerHTML = `<span class="btn-icon">-</span> ${t.clearHistory}`;
  }
  
  // Hakkında bölümü
  document.querySelector(".about-info .version").textContent = t.version;
  document.querySelector(".about-info .description").textContent = t.description;
  document.querySelector(".about-info .copyright").textContent = t.copyright;

  AI_PROVIDER_IDS.forEach((providerId) => {
    const fields = aiProviderFields[providerId];
    if (!fields) return;
    const apiKeyLabel = document.getElementById(`${providerId}ApiKeyLabel`);
    const baseUrlLabel = document.getElementById(`${providerId}BaseUrlLabel`);
    const textModelLabel = document.getElementById(`${providerId}TextModelLabel`);
    const visionModelLabel = document.getElementById(`${providerId}VisionModelLabel`);
    if (apiKeyLabel) apiKeyLabel.textContent = t.apiKey;
    if (baseUrlLabel) baseUrlLabel.textContent = t.baseUrl;
    if (textModelLabel) textModelLabel.textContent = t.textModel;
    if (visionModelLabel) visionModelLabel.textContent = t.visionModel;
    if (fields.refreshButton) fields.refreshButton.textContent = t.refreshModels;
    if (fields.testButton) fields.testButton.textContent = t.testConnection;
    if (fields.clearKeyButton) fields.clearKeyButton.textContent = t.clearSavedKey;
    if (providerId === "ollama" && fields.pullButton) {
      fields.pullButton.textContent = t.pullModel;
    }
    if (providerId === "ollama" && fields.pullInput) {
      fields.pullInput.placeholder = t.ollamaPullPlaceholder;
    }
    if (providerId === "openrouter") {
      const textModelIdLabel = document.getElementById("openrouterCustomTextModelLabel");
      const visionModelIdLabel = document.getElementById("openrouterCustomVisionModelLabel");
      if (textModelIdLabel) textModelIdLabel.textContent = t.textModelId;
      if (visionModelIdLabel) visionModelIdLabel.textContent = t.visionModelId;
      if (fields.baseUrlHint) fields.baseUrlHint.textContent = t.baseUrlDefaultHint;
    }
    updateProviderKeyHint(providerId, aiSettingsState?.providers?.[providerId]);
  });

  if (googleEdgeTitle) googleEdgeTitle.textContent = t.googleEdgeTitle;
  if (googleEdgeDescription) googleEdgeDescription.textContent = t.googleEdgeDescription;

  if (!aiSettingsStatus || !aiSettingsStatus.textContent.trim()) {
    setAIStatus(t.aiSettingsIdle);
  }
  if (excelFullscreenBtn) {
    excelFullscreenBtn.title = isExcelFullscreen ? t.exitFullscreen : t.fullscreen;
  }
  updatePreviewFullscreenButton();
  updateHistoryUI();
  
  console.log(`Dil değiştirildi: ${lang}`);
}

// Dil butonu
langToggle.addEventListener("click", () => {
  const newLang = currentLang === "tr" ? "en" : "tr";
  updateLanguage(newLang);
});

if (toolbarLangToggle) {
  toolbarLangToggle.addEventListener("click", () => {
    const newLang = currentLang === "tr" ? "en" : "tr";
    updateLanguage(newLang);
  });
}

// İlk yüklemede dili ayarla
updateLanguage(currentLang);

function clearFileHistoryWithConfirm() {
  const t = getCurrentTranslation();
  if (confirm(t.clearHistoryConfirm)) {
    localStorage.removeItem("fileHistory");
    localStorage.removeItem("fileHistoryPinned");
    historySearchTerm = "";
    if (historySearchInput) historySearchInput.value = "";
    updateHistoryUI();
    console.log("Dosya geçmişi temizlendi");
  }
}

// Geçmişi temizle butonları
if (clearHistoryBtn) {
  clearHistoryBtn.addEventListener("click", clearFileHistoryWithConfirm);
}

if (clearRecentFilesBtn) {
  clearRecentFilesBtn.addEventListener("click", clearFileHistoryWithConfirm);
}

function reloadActiveFile() {
  if (currentFileData && currentFileData.fullPath) {
    console.log("Dosya yeniden yükleniyor:", currentFileData.fullPath);
    const activeTab = getActiveDocumentTab();
    if (activeTab) {
      tabState = window.FilePeekTabs.closeTab(tabState, activeTab.id);
    }
    loadFile(currentFileData.fullPath);
  }
}

// Dosyayı yeniden yükle butonu
reloadFileBtn.addEventListener("click", reloadActiveFile);

if (previewFullscreenBtn) {
  previewFullscreenBtn.addEventListener("click", () => {
    setPreviewFullscreen(!isPreviewFullscreen);
  });
  updatePreviewFullscreenButton();
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && isPreviewFullscreen) {
    setPreviewFullscreen(false);
  }
});

// ===== WORD & EXCEL EDITOR =====

// Modal elementleri
const wordEditorModal = document.getElementById("wordEditorModal");
const excelEditorModal = document.getElementById("excelEditorModal");
const wordEditorContent = document.getElementById("wordEditorContent");
const excelEditorContent = document.getElementById("excelEditorContent");
const excelEditorSurface = excelEditorModal ? excelEditorModal.querySelector(".excel-editor-modal") : null;

// Butonlar
const editWordBtn = document.getElementById("editWordBtn");
const editExcelBtn = document.getElementById("editExcelBtn");
const closeWordEditor = document.getElementById("closeWordEditor");
const closeExcelEditor = document.getElementById("closeExcelEditor");
const saveWordBtn = document.getElementById("saveWordBtn");
const saveWordAsBtn = document.getElementById("saveWordAsBtn");
const cancelWordBtn = document.getElementById("cancelWordBtn");
const saveExcelBtn = document.getElementById("saveExcelBtn");
const saveExcelAsBtn = document.getElementById("saveExcelAsBtn");
const cancelExcelBtn = document.getElementById("cancelExcelBtn");

// Word toolbar butonları
const boldBtn = document.getElementById("boldBtn");
const italicBtn = document.getElementById("italicBtn");
const underlineBtn = document.getElementById("underlineBtn");
const headingSelect = document.getElementById("headingSelect");
const listBtn = document.getElementById("listBtn");

// Excel toolbar butonları
const addRowBtn = document.getElementById("addRowBtn");
const addColBtn = document.getElementById("addColBtn");
const deleteRowBtn = document.getElementById("deleteRowBtn");
const deleteColBtn = document.getElementById("deleteColBtn");
const cellInfo = document.getElementById("cellInfo");

// Excel biçimlendirme butonları
const boldCellBtn = document.getElementById("boldCellBtn");
const italicCellBtn = document.getElementById("italicCellBtn");
const underlineCellBtn = document.getElementById("underlineCellBtn");
const alignLeftBtn = document.getElementById("alignLeftBtn");
const alignCenterBtn = document.getElementById("alignCenterBtn");
const alignRightBtn = document.getElementById("alignRightBtn");
const bgColorPicker = document.getElementById("bgColorPicker");
const textColorPicker = document.getElementById("textColorPicker");

// Formül çubuğu
const formulaInput = document.getElementById("formulaInput");
const formulaCellName = document.getElementById("formulaCellName");
const excelSheetSelect = document.getElementById("excelSheetSelect");

let currentEditingFile = null;
let excelSheets = [];
let activeExcelSheetIndex = 0;
let excelData = []; // Şimdi {value, style} objesi içerecek
let selectedCell = null;
let selectedRow = null;
let selectedColumn = null;
const EXCEL_ROW_HEIGHT = 38;
const EXCEL_ROW_OVERSCAN = 4;

function getExcelVirtualization() {
  return window.FilePeekExcelVirtualization || {
    calculateVisibleRange({ rowCount, rowHeight, viewportHeight, scrollTop, overscan = 4 }) {
      const totalHeight = rowCount * rowHeight;
      if (!rowCount) {
        return { startRow: 0, endRow: -1, paddingTop: 0, paddingBottom: 0, totalHeight: 0 };
      }

      const visibleRowCount = Math.max(1, Math.ceil(viewportHeight / rowHeight));
      const firstVisibleRow = Math.max(0, Math.floor(scrollTop / rowHeight));
      const lastVisibleRow = Math.min(rowCount - 1, firstVisibleRow + visibleRowCount - 1);
      const startRow = Math.max(0, firstVisibleRow - overscan);
      const endRow = Math.min(rowCount - 1, lastVisibleRow + overscan);
      return {
        startRow,
        endRow,
        paddingTop: startRow * rowHeight,
        paddingBottom: Math.max(0, (rowCount - endRow - 1) * rowHeight),
        totalHeight,
      };
    }
  };
}

function updateExcelFullscreenButton() {
  if (!excelFullscreenBtn) return;
  const t = getCurrentTranslation();
  excelFullscreenBtn.title = isExcelFullscreen ? t.exitFullscreen : t.fullscreen;
  excelFullscreenBtn.innerHTML = getIconMarkup(isExcelFullscreen ? "compress" : "expand", "modal-btn-icon");
}

function setExcelFullscreen(nextState) {
  if (!excelEditorSurface) return;
  isExcelFullscreen = nextState;
  excelEditorSurface.classList.toggle("is-fullscreen", nextState);
  updateExcelFullscreenButton();
}

function getSelectionCells() {
  if (selectedRow !== null) {
    return excelData[selectedRow] || [];
  }
  if (selectedColumn !== null) {
    return excelData.map(row => row[selectedColumn]).filter(Boolean);
  }
  if (selectedCell) {
    return [excelData[selectedCell.row]?.[selectedCell.col]].filter(Boolean);
  }
  return [];
}

function toggleStyleOnSelection(key) {
  const cells = getSelectionCells();
  if (!cells.length) return;
  const current = !!cells[0].style[key];
  cells.forEach(cell => {
    cell.style[key] = !current;
  });
  renderExcelTable();
}

function setAlignOnSelection(value) {
  const cells = getSelectionCells();
  if (!cells.length) return;
  cells.forEach(cell => {
    cell.style.align = value;
  });
  renderExcelTable();
}

function setColorOnSelection(key, value) {
  const cells = getSelectionCells();
  if (!cells.length) return;
  cells.forEach(cell => {
    cell.style[key] = value;
  });
  renderExcelTable();
}

function createExcelCell(value = "", style = {}) {
  return {
    value,
    style: {
      bold: false,
      italic: false,
      underline: false,
      align: "left",
      bgColor: "#ffffff",
      textColor: "#000000",
      ...style,
    },
  };
}

function cloneSheetRows(rows = []) {
  return rows.map((row) =>
    row.map((cell) => {
      if (cell && typeof cell === "object") {
        return createExcelCell(cell.value ?? "", cell.style || {});
      }
      return createExcelCell(cell || "");
    })
  );
}

function syncActiveExcelSheet() {
  const activeSheet = excelSheets[activeExcelSheetIndex];
  excelData = activeSheet?.rows || [];
}

function renderExcelSheetOptions() {
  if (!excelSheetSelect) return;

  excelSheetSelect.innerHTML = excelSheets.map((sheet, index) => (
    `<option value="${index}" ${index === activeExcelSheetIndex ? "selected" : ""}>${escapeHtml(sheet.name)}</option>`
  )).join("");
  excelSheetSelect.disabled = excelSheets.length <= 1;
}

function ensureExcelCell(rowIndex, colIndex) {
  if (!excelData[rowIndex]) {
    excelData[rowIndex] = [];
  }

  if (!excelData[rowIndex][colIndex] || typeof excelData[rowIndex][colIndex] !== "object") {
    const rawValue = excelData[rowIndex][colIndex];
    excelData[rowIndex][colIndex] = createExcelCell(typeof rawValue === "string" ? rawValue : rawValue?.value || "");
  } else if (!excelData[rowIndex][colIndex].style) {
    excelData[rowIndex][colIndex].style = createExcelCell().style;
  }

  return excelData[rowIndex][colIndex];
}

function ensureSelectedCellVisible() {
  if (!excelEditorContent || !selectedCell) return;

  const visibleTop = excelEditorContent.scrollTop;
  const visibleBottom = visibleTop + excelEditorContent.clientHeight;
  const cellTop = selectedCell.row * EXCEL_ROW_HEIGHT;
  const cellBottom = cellTop + EXCEL_ROW_HEIGHT;

  if (cellTop < visibleTop) {
    excelEditorContent.scrollTop = cellTop;
  } else if (cellBottom > visibleBottom) {
    excelEditorContent.scrollTop = Math.max(0, cellBottom - excelEditorContent.clientHeight);
  }
}

// Word düzenle butonu
editWordBtn.addEventListener("click", () => {
  if (!currentFileData || currentFileData.type !== "docx") return;
  
  wordEditorModal.classList.remove("hidden");
  
  // Metni temizle ve düzgün paragraflar halinde göster
  let text = currentFileData.fullText || currentFileData.sample || "";
  
  // Satır sonlarını paragraf sonlarına çevir
  text = text.replace(/\r\n/g, '\n');
  text = text.replace(/\r/g, '\n');
  
  // Boş satırları paragraf ayırıcısı olarak kullan
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());
  
  // Her paragrafı <p> etiketi içine al
  let html = '';
  paragraphs.forEach(para => {
    const cleanPara = para.trim().replace(/\n/g, '<br>');
    html += `<p>${cleanPara}</p>`;
  });
  
  wordEditorContent.innerHTML = html || "<p>Metin bulunamadı...</p>";
  currentEditingFile = currentFileData.fullPath || null;
});

// Excel düzenle butonu
editExcelBtn.addEventListener("click", () => {
  console.log("Excel düzenle butonu tıklandı");
  console.log("currentFileData:", currentFileData);
  
  if (!currentFileData || currentFileData.type !== "xlsx") {
    console.error("Excel dosyası değil!");
    return;
  }
  
  excelEditorModal.classList.remove("hidden");
  setExcelFullscreen(false);
  currentEditingFile = currentFileData.fullPath || null;
  
  // Excel verilerini yükle (değer + stil)
  if (currentFileData.sheetData && currentFileData.sheetData.length > 0) {
    excelSheets = currentFileData.sheetData.map((sheet) => ({
      name: sheet.name,
      rows: cloneSheetRows(sheet.rows),
    }));
  } else if (currentFileData.editorRows && currentFileData.editorRows.length > 0) {
    console.log("Mevcut Excel verileri yükleniyor:", currentFileData.editorRows.length, "satır");
    excelSheets = [{
      name: currentFileData.sheets?.[0] || "Sheet1",
      rows: cloneSheetRows(currentFileData.editorRows),
    }];
  } else if (currentFileData.rows && currentFileData.rows.length > 0) {
    console.log("Preview satırlarından Excel verisi yükleniyor:", currentFileData.rows.length, "satır");
    excelSheets = [{
      name: currentFileData.sheets?.[0] || "Sheet1",
      rows: currentFileData.rows.map((row) =>
        row.map((value) => createExcelCell(value || ""))
      ),
    }];
  } else {
    console.log("Bos tablo olusturuluyor");
    excelSheets = [{
      name: "Sheet1",
      rows: Array(10).fill(null).map(() =>
        Array(10).fill(null).map(() => createExcelCell())
      ),
    }];
  }

  activeExcelSheetIndex = 0;
  syncActiveExcelSheet();
  renderExcelSheetOptions();
  console.log("excelData hazır:", excelData);
  selectedCell = { row: 0, col: 0 };
  selectedRow = null;
  selectedColumn = null;
  excelEditorContent.scrollTop = 0;
  
  try {
    renderExcelTable();
    console.log("Tablo render edildi");
  } catch (error) {
    console.error("Tablo render hatası:", error);
  }
});

if (excelFullscreenBtn) {
  excelFullscreenBtn.addEventListener("click", () => {
    setExcelFullscreen(!isExcelFullscreen);
  });
  updateExcelFullscreenButton();
}

if (excelSheetSelect) {
  const excelToolbar = excelEditorModal?.querySelector(".editor-toolbar");
  if (excelToolbar && excelSheetSelect.parentElement?.parentElement !== excelToolbar) {
    excelToolbar.prepend(excelSheetSelect.parentElement);
  }

  excelSheetSelect.addEventListener("change", (event) => {
    activeExcelSheetIndex = Number(event.target.value) || 0;
    syncActiveExcelSheet();
    selectedCell = { row: 0, col: 0 };
    selectedRow = null;
    selectedColumn = null;
    excelEditorContent.scrollTop = 0;
    renderExcelTable();
  });
}

// Word toolbar işlevleri
boldBtn.addEventListener("click", () => {
  document.execCommand("bold", false, null);
  wordEditorContent.focus();
});

italicBtn.addEventListener("click", () => {
  document.execCommand("italic", false, null);
  wordEditorContent.focus();
});

underlineBtn.addEventListener("click", () => {
  document.execCommand("underline", false, null);
  wordEditorContent.focus();
});

headingSelect.addEventListener("change", (e) => {
  const value = e.target.value;
  if (value === "p") {
    document.execCommand("formatBlock", false, "<p>");
  } else {
    document.execCommand("formatBlock", false, `<${value}>`);
  }
  wordEditorContent.focus();
});

listBtn.addEventListener("click", () => {
  document.execCommand("insertUnorderedList", false, null);
  wordEditorContent.focus();
});

// Excel tablo oluştur (gelişmiş - stil desteğiyle)
function renderExcelTable() {
  if (!excelData || excelData.length === 0) {
    console.error("Excel verisi boş!");
    return;
  }
  
  const rows = excelData.length;
  const cols = excelData[0]?.length || 10;
  const range = getExcelVirtualization().calculateVisibleRange({
    rowCount: rows,
    rowHeight: EXCEL_ROW_HEIGHT,
    viewportHeight: excelEditorContent.clientHeight || 400,
    scrollTop: excelEditorContent.scrollTop || 0,
    overscan: EXCEL_ROW_OVERSCAN,
  });
  
  let html = '<table class="excel-table">';
  
  // Başlık satırı (A, B, C, ...)
  html += '<thead><tr><th></th>';
  for (let c = 0; c < cols; c++) {
    html += `<th class="col-header" data-col="${c}">${String.fromCharCode(65 + c)}</th>`;
  }
  html += '</tr></thead><tbody>';
  
  if (range.paddingTop > 0) {
    html += `<tr class="excel-spacer-row" aria-hidden="true"><th class="excel-row-number"></th><td colspan="${cols}"><div class="excel-spacer" style="height:${range.paddingTop}px"></div></td></tr>`;
  }

  // Veri satırları
  for (let r = range.startRow; r <= range.endRow; r++) {
    html += `<tr><th class="row-header excel-row-number" data-row="${r}">${r + 1}</th>`;
    for (let c = 0; c < cols; c++) {
      const cell = ensureExcelCell(r, c);
      
      const rawValue = cell.value ?? "";
      const computedValue = (rawValue && rawValue.toString().startsWith('=')) ? evaluateFormula(rawValue.toString(), r, c) : rawValue;
      const displayValue = computedValue ?? "";
      const safeValue = escapeAttribute(displayValue);
      
      const style = `
        background-color: ${cell.style?.bgColor || '#ffffff'};
        color: ${cell.style?.textColor || '#000000'};
        font-weight: ${cell.style?.bold ? 'bold' : 'normal'};
        font-style: ${cell.style?.italic ? 'italic' : 'normal'};
        text-decoration: ${cell.style?.underline ? 'underline' : 'none'};
        text-align: ${cell.style?.align || 'left'};
      `;
      
      html += `<td data-row="${r}" data-col="${c}" style="${style}">
        <input type="text" value="${safeValue}" data-row="${r}" data-col="${c}" style="${style}" />
      </td>`;
    }
    html += '</tr>';
  }

  if (range.paddingBottom > 0) {
    html += `<tr class="excel-spacer-row" aria-hidden="true"><th class="excel-row-number"></th><td colspan="${cols}"><div class="excel-spacer" style="height:${range.paddingBottom}px"></div></td></tr>`;
  }
  
  html += '</tbody></table>';
  excelEditorContent.innerHTML = html;

  if (!excelEditorContent.dataset.virtualScrollBound) {
    excelEditorContent.addEventListener("scroll", () => {
      window.requestAnimationFrame(() => {
        renderExcelTable();
      });
    });
    excelEditorContent.dataset.virtualScrollBound = "true";
  }
  
  // Input değişikliklerini dinle
  const inputs = excelEditorContent.querySelectorAll("input");
  inputs.forEach(input => {
    input.addEventListener("input", (e) => {
      const row = parseInt(e.target.dataset.row);
      const col = parseInt(e.target.dataset.col);
      excelData[row][col].value = e.target.value;
      updateFormulaBar();
    });
    
    input.addEventListener("focus", (e) => {
      const row = parseInt(e.target.dataset.row);
      const col = parseInt(e.target.dataset.col);
      selectedCell = { row, col };
      selectedRow = null;
      selectedColumn = null;
      const cellName = `${String.fromCharCode(65 + col)}${row + 1}`;
      cellInfo.textContent = `Hücre: ${cellName}`;
      formulaCellName.textContent = cellName;
      updateFormulaBar();
      updateSelectionHighlight();
    });
  });
  
  // Sütun başlıklarına tıklama
  excelEditorContent.querySelectorAll(".col-header").forEach(header => {
    header.addEventListener("click", () => {
      selectedColumn = parseInt(header.dataset.col);
      selectedRow = null;
      selectedCell = null;
      formulaCellName.textContent = `${String.fromCharCode(65 + selectedColumn)}*`;
      formulaInput.value = "";
      updateSelectionHighlight();
    });
  });
  
  // Satır başlıklarına tıklama
  excelEditorContent.querySelectorAll(".row-header").forEach(header => {
    header.addEventListener("click", () => {
      selectedRow = parseInt(header.dataset.row);
      selectedColumn = null;
      selectedCell = null;
      formulaCellName.textContent = `*${selectedRow + 1}`;
      formulaInput.value = "";
      updateSelectionHighlight();
    });
  });
  
  // İlk hücreye focus
  if (selectedCell) {
    ensureSelectedCellVisible();
    const input = excelEditorContent.querySelector(`input[data-row="${selectedCell.row}"][data-col="${selectedCell.col}"]`);
    if (input && document.activeElement !== input) input.focus({ preventScroll: true });
  }
  
  updateSelectionHighlight();
}

// Formül çubuğunu güncelle
function updateFormulaBar() {
  if (selectedCell) {
    const cell = excelData[selectedCell.row]?.[selectedCell.col];
    if (cell) {
      formulaInput.value = cell.value;
    }
  } else {
    formulaInput.value = "";
  }
}

function updateSelectionHighlight() {
  excelEditorContent.querySelectorAll("td").forEach(td => {
    td.classList.remove("selected-row");
    td.classList.remove("selected-column");
  });
  excelEditorContent.querySelectorAll(".row-header").forEach(th => th.classList.remove("active"));
  excelEditorContent.querySelectorAll(".col-header").forEach(th => th.classList.remove("active"));
  
  if (selectedRow !== null) {
    excelEditorContent.querySelectorAll(`td[data-row="${selectedRow}"]`).forEach(td => td.classList.add("selected-row"));
    const header = excelEditorContent.querySelector(`.row-header[data-row="${selectedRow}"]`);
    if (header) header.classList.add("active");
  }
  
  if (selectedColumn !== null) {
    excelEditorContent.querySelectorAll(`td[data-col="${selectedColumn}"]`).forEach(td => td.classList.add("selected-column"));
    const header = excelEditorContent.querySelector(`.col-header[data-col="${selectedColumn}"]`);
    if (header) header.classList.add("active");
  }
}

// Formül motoru (basit)
function evaluateFormula(formula, currentRow, currentCol) {
  if (!window.FilePeekExcelFormulas?.evaluateFormula) {
    return "#HATA!";
  }

  return window.FilePeekExcelFormulas.evaluateFormula(formula, excelData);
}

function calculateRange(startCol, startRow, endCol, endRow, operation) {
  const values = [];
  const startC = startCol.charCodeAt(0) - 65;
  const endC = endCol.charCodeAt(0) - 65;
  
  for (let r = startRow; r <= endRow; r++) {
    for (let c = startC; c <= endC; c++) {
      const val = parseFloat(excelData[r]?.[c]?.value || 0);
      if (!isNaN(val)) values.push(val);
    }
  }
  
  switch (operation) {
    case 'sum':
      return values.reduce((a, b) => a + b, 0);
    case 'avg':
      return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    case 'count':
      return values.length;
    default:
      return 0;
  }
}

// Formül çubuğundan değer güncelle
formulaInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter" && selectedCell) {
    excelData[selectedCell.row][selectedCell.col].value = formulaInput.value;
    renderExcelTable();
  }
});

// Excel satır/sütun işlemleri
addRowBtn.addEventListener("click", () => {
  const cols = excelData[0]?.length || 10;
  const newRow = Array(cols).fill(null).map(() => createExcelCell());
  excelData.push(newRow);
  renderExcelTable();
});

addColBtn.addEventListener("click", () => {
  excelData.forEach(row => row.push(createExcelCell()));
  renderExcelTable();
});

deleteRowBtn.addEventListener("click", () => {
  if (excelData.length > 1) {
    excelData.pop();
    renderExcelTable();
  }
});

deleteColBtn.addEventListener("click", () => {
  if (excelData[0]?.length > 1) {
    excelData.forEach(row => row.pop());
    renderExcelTable();
  }
});

// Biçimlendirme butonları
boldCellBtn.addEventListener("click", () => {
  toggleStyleOnSelection("bold");
});

italicCellBtn.addEventListener("click", () => {
  toggleStyleOnSelection("italic");
});

underlineCellBtn.addEventListener("click", () => {
  toggleStyleOnSelection("underline");
});

alignLeftBtn.addEventListener("click", () => {
  setAlignOnSelection("left");
});

alignCenterBtn.addEventListener("click", () => {
  setAlignOnSelection("center");
});

alignRightBtn.addEventListener("click", () => {
  setAlignOnSelection("right");
});

bgColorPicker.addEventListener("change", (e) => {
  setColorOnSelection("bgColor", e.target.value);
});

textColorPicker.addEventListener("change", (e) => {
  setColorOnSelection("textColor", e.target.value);
});

// Word kaydet
saveWordBtn.addEventListener("click", async () => {
  if (!currentEditingFile) {
    alert("Dosya yolu bulunamadı! 'Farklı Kaydet' kullanın.");
    return;
  }
  
  const htmlContent = wordEditorContent.innerHTML;
  const result = await window.kankaAPI.saveWord(currentEditingFile, htmlContent);
  
  if (result.success) {
    alert("Word dosyası kaydedildi!");
    wordEditorModal.classList.add("hidden");
  } else {
    alert("Hata: " + result.error);
  }
});

// Word farklı kaydet
saveWordAsBtn.addEventListener("click", async () => {
  const filePath = await window.kankaAPI.showSaveDialog("document.docx", [
    { name: "Word Belgesi", extensions: ["docx"] },
    { name: "Tüm Dosyalar", extensions: ["*"] }
  ]);
  
  if (!filePath) return;
  
  const htmlContent = wordEditorContent.innerHTML;
  const result = await window.kankaAPI.saveWord(filePath, htmlContent);
  
  if (result.success) {
    alert("Word dosyası kaydedildi!");
    wordEditorModal.classList.add("hidden");
    currentEditingFile = filePath;
  } else {
    alert("Hata: " + result.error);
  }
});

// Excel kaydet
saveExcelBtn.addEventListener("click", async () => {
  if (!currentEditingFile) {
    alert("Dosya yolu bulunamadı! 'Farklı Kaydet' kullanın.");
    return;
  }
  
  const data = {
    sheetName: excelSheets[activeExcelSheetIndex]?.name || "Sheet1",
    rows: excelData,
    sheets: excelSheets.map((sheet) => ({
      name: sheet.name,
      rows: sheet.rows,
    }))
  };
  
  const result = await window.kankaAPI.saveExcel(currentEditingFile, data);
  
  if (result.success) {
    alert("Excel dosyası kaydedildi!");
    excelEditorModal.classList.add("hidden");
  } else {
    alert("Hata: " + result.error);
  }
});

// Excel farklı kaydet
saveExcelAsBtn.addEventListener("click", async () => {
  const filePath = await window.kankaAPI.showSaveDialog("workbook.xlsx", [
    { name: "Excel Çalışma Kitabı", extensions: ["xlsx"] },
    { name: "Tüm Dosyalar", extensions: ["*"] }
  ]);
  
  if (!filePath) return;
  
  const data = {
    sheetName: excelSheets[activeExcelSheetIndex]?.name || "Sheet1",
    rows: excelData,
    sheets: excelSheets.map((sheet) => ({
      name: sheet.name,
      rows: sheet.rows,
    }))
  };
  
  const result = await window.kankaAPI.saveExcel(filePath, data);
  
  if (result.success) {
    alert("Excel dosyası kaydedildi!");
    excelEditorModal.classList.add("hidden");
    currentEditingFile = filePath;
  } else {
    alert("Hata: " + result.error);
  }
});

// Modal kapatma
closeWordEditor.addEventListener("click", () => wordEditorModal.classList.add("hidden"));
cancelWordBtn.addEventListener("click", () => wordEditorModal.classList.add("hidden"));
closeExcelEditor.addEventListener("click", () => {
  setExcelFullscreen(false);
  excelEditorModal.classList.add("hidden");
});
cancelExcelBtn.addEventListener("click", () => {
  setExcelFullscreen(false);
  excelEditorModal.classList.add("hidden");
});

// Dosya yüklendiğinde düzenle butonlarını göster/gizle
function updateEditorButtons() {
  const wordEditButton = document.getElementById("editWordBtn");
  const excelEditButton = document.getElementById("editExcelBtn");

  if (!wordEditButton || !excelEditButton) {
    return;
  }

  const isWord = currentFileData?.type === "docx";
  const isExcel = currentFileData?.type === "xlsx" || currentFileData?.type === "xls";
  
  if (isWord) {
    wordEditButton.classList.remove("hidden");
    excelEditButton.classList.add("hidden");
  } else if (isExcel) {
    wordEditButton.classList.add("hidden");
    excelEditButton.classList.remove("hidden");
  } else {
    wordEditButton.classList.add("hidden");
    excelEditButton.classList.add("hidden");
  }
}

// pickFileBtn eventini güncelle (mevcut fonksiyona updateEditorButtons ekle)
const originalPickFileHandler = pickFileBtn.onclick;
pickFileBtn.addEventListener("click", async () => {
  // ... mevcut kod ...
  setTimeout(updateEditorButtons, 500);
});

// İlk yükleme mesajı
console.log("KankaAI hazır! (Editör modülleri yüklendi)");


