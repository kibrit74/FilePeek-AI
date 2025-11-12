let previewFilePath = null;

const fileNameEl = document.getElementById("fileName");
const fileMetaEl = document.getElementById("fileMeta");
const fileTypeChip = document.getElementById("fileTypeChip");
const summaryLoadingEl = document.getElementById("summaryLoading");
const summaryTextEl = document.getElementById("summaryText");
const summaryErrorEl = document.getElementById("summaryError");
const openFullBtn = document.getElementById("openFullBtn");
const cancelPreviewBtn = document.getElementById("cancelPreviewBtn");

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

function showLoading() {
  summaryLoadingEl.classList.remove("hidden");
  summaryTextEl.classList.add("hidden");
  summaryErrorEl.classList.add("hidden");
}

function showError(message) {
  summaryLoadingEl.classList.add("hidden");
  summaryTextEl.classList.add("hidden");
  summaryErrorEl.textContent = message;
  summaryErrorEl.classList.remove("hidden");
}

function showSummary(text) {
  summaryLoadingEl.classList.add("hidden");
  summaryErrorEl.classList.add("hidden");
  summaryTextEl.textContent = text;
  summaryTextEl.classList.remove("hidden");
}

async function generateSummary(data) {
  try {
    if (data.type === "image") {
      const quickResult = await window.kankaAPI.aiAnalyzeImageQuick(data.base64, data.mimeType);
      if (quickResult?.success && quickResult.description) {
        return `🖼️ Hızlı Resim Özeti\n${quickResult.description}`;
      }
      return "🖼️ Resim için kısa betimleme üretilemedi. Detaylı inceleme yapabilirsiniz.";
    }

    if (data.type === "xlsx") {
      const sheetCount = data.sheets?.length || 1;
      const totalRows = data.totalRows ?? data.rows?.length ?? 0;
      const headers = data.rows?.[0] || [];
      const firstRow = data.rows?.[1] || [];

      let summary = `📊 Excel Tablosu • ${sheetCount} sayfa, yaklaşık ${totalRows} satır\n`;
      if (headers.length) {
        summary += `Başlıklar: ${headers.slice(0, 6).join(", ")}`;
      }
      if (firstRow.length) {
        summary += `\nİlk satır: ${firstRow.slice(0, 6).join(", ")}`;
      }
      return summary.trim();
    }

    if (data.type === "zip") {
      const entries = data.entries || [];
      const total = data.totalFiles || entries.length;
      const folders = entries.filter(e => e.isFolder).length;
      const files = total - folders;
      const highlights = entries
        .filter(e => !e.isFolder)
        .slice(0, 3)
        .map(e => e.name.split("/").pop());
      const highlightText = highlights.length ? `İlk dosyalar: ${highlights.join(", ")}` : "Dosya isimleri listelenemedi.";
      return `📦 ZIP arşivi, ${total} öğe (${files} dosya, ${folders} klasör). ${highlightText}`;
    }

    let textSample = data.sample || data.fullText || "";
    if (!textSample) {
      return "📁 Bu dosya için hızlı özet oluşturulamadı.";
    }

    textSample = textSample.toString().slice(0, 4000);
    const summaryRes = await window.kankaAPI.aiSummary(textSample);
    if (summaryRes?.success && summaryRes.summary) {
      return summaryRes.summary;
    }

    return textSample.slice(0, 300) + (textSample.length > 300 ? "..." : "");
  } catch (error) {
    console.error("Özet oluşturulamadı:", error);
    throw error;
  }
}

async function handlePreview(filePath) {
  try {
    previewFilePath = filePath;
    const fileName = filePath.split(/[/\\]/).pop();
    fileNameEl.textContent = fileName;
    fileTypeChip.textContent = pathToTypeLabel(fileName);

    showLoading();

    const data = await window.kankaAPI.peekFile(filePath);
    if (data.error) {
      showError(data.error);
      return;
    }

    if (data.size) {
      fileMetaEl.textContent = `${formatBytes(data.size)} • ${pathToTypeLabel(fileName)}`;
    } else {
      fileMetaEl.textContent = pathToTypeLabel(fileName);
    }

    const summary = await generateSummary(data);
    showSummary(summary);
  } catch (error) {
    showError(`Önizleme başarısız oldu: ${error.message || error}`);
  }
}

function pathToTypeLabel(fileName) {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  const map = {
    pdf: "PDF Belgesi",
    docx: "Word Belgesi",
    doc: "Word Belgesi",
    xlsx: "Excel Tablosu",
    xls: "Excel Tablosu",
    txt: "Metin Dosyası",
    md: "Markdown",
    csv: "CSV",
    zip: "ZIP Arşivi",
    jpg: "Resim",
    jpeg: "Resim",
    png: "Resim",
    gif: "Resim",
    webp: "Resim",
    bmp: "Resim",
    udf: "UDF Hukuk Belgesi"
  };
  return map[ext] || `${ext.toUpperCase()} Dosyası`;
}

window.kankaAPI.onPreviewFile((filePath) => {
  handlePreview(filePath);
});

openFullBtn.addEventListener("click", async () => {
  openFullBtn.disabled = true;
  await window.kankaAPI.openFullView(previewFilePath);
});

cancelPreviewBtn.addEventListener("click", () => {
  window.close();
});

