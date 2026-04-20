(function exposeFileActions(root) {
  function createFilePickerActions({ api, loadFile }) {
    async function openSingleFile() {
      const filePath = await api.pickFile();
      if (!filePath) return null;

      await loadFile(filePath, false);
      return filePath;
    }

    return { openSingleFile };
  }

  function getFileNameFromPath(filePath) {
    return String(filePath || "").split(/[\\/]/).pop() || "Dosya";
  }

  function createBatchHistoryActions({ addToHistory }) {
    function addReadFileToHistory(filePath, data = {}) {
      if (!filePath || data.error) return false;

      addToHistory(
        filePath,
        data.name || getFileNameFromPath(filePath),
        data.type || "",
        data.size || null
      );

      return true;
    }

    return { addReadFileToHistory };
  }

  function createVoiceQuestionActions({ askQuestion, showAIResult, speakText, getVoiceState }) {
    async function askAndMaybeSpeak({ text, question, title }) {
      const result = await askQuestion(text, question);

      if (result?.success) {
        showAIResult(title, result.answer);
        if (getVoiceState()?.autoSpeakAnswer) {
          speakText(result.answer);
        }
      }

      return result;
    }

    return { askAndMaybeSpeak };
  }

  function normalizeText(value) {
    return String(value || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  }

  function isExcelType(type) {
    return ["xls", "xlsx"].includes(String(type || "").toLowerCase());
  }

  function unique(items, limit) {
    const seen = new Set();
    const result = [];
    items.forEach(item => {
      const normalized = String(item || "").trim();
      const key = normalized.toLocaleLowerCase("tr-TR");
      if (!normalized || seen.has(key)) return;
      seen.add(key);
      result.push(normalized);
    });
    return result.slice(0, limit);
  }

  function extractManifestSignals(text) {
    const lines = normalizeText(text)
      .split("\n")
      .map(line => line.trim())
      .filter(Boolean);

    const headingCandidates = lines.filter(line => {
      if (line.length < 5 || line.length > 120) return false;
      const letters = line.replace(/[^A-Za-zÇĞİÖŞÜçğıöşü]/g, "");
      if (letters.length < 4) return false;
      return line === line.toLocaleUpperCase("tr-TR") || /^[0-9]+[.)-]\s+/.test(line);
    });

    const dates = text.match(/\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b/g) || [];
    const numbered = lines.filter(line => /^[0-9]+[.)-]\s+/.test(line));

    return {
      headings: unique(headingCandidates, 5),
      dates: unique(dates, 8),
      numbered: unique(numbered, 5),
    };
  }

  function buildFileManifest(item) {
    const data = item.data || {};
    const text = normalizeText(item.text || data.fullText || data.sample);
    const signals = extractManifestSignals(text);
    const preview = text.slice(0, 420);
    const lines = [
      `Dosya: ${item.fileName || data.name || "Dosya"}`,
      `Tur: ${data.type || "bilinmiyor"}`,
      data.size ? `Boyut: ${data.size} bayt` : null,
      `Metin uzunlugu: ${text.length} karakter`,
      signals.headings.length ? `Baslik sinyalleri: ${signals.headings.join(" | ")}` : null,
      signals.dates.length ? `Tarih sinyalleri: ${signals.dates.join(", ")}` : null,
      signals.numbered.length ? `Numarali madde sinyalleri: ${signals.numbered.join(" | ")}` : null,
      "Kisa onizleme:",
      preview || "(metin yok)",
    ];

    return lines.filter(Boolean).join("\n");
  }

  function tokenizeQuery(question) {
    const stopWords = new Set([
      "ve", "ile", "icin", "için", "mi", "mu", "mı", "mü", "ne", "nedir", "hangi",
      "kim", "nerede", "var", "olan", "bir", "bu", "su", "şu", "the", "and", "or",
      "what", "which", "who", "where", "is", "are"
    ]);

    return unique(
      normalizeText(question)
        .toLocaleLowerCase("tr-TR")
        .split(/[^0-9a-zçğıöşü]+/i)
        .filter(token => token.length >= 2 && !stopWords.has(token)),
      24
    );
  }

  function createChunks(text, maxLength = 1200) {
    const normalized = normalizeText(text);
    if (!normalized) return [];

    const paragraphs = normalized.split(/\n{2,}/).map(part => part.trim()).filter(Boolean);
    const chunks = [];
    let buffer = "";

    paragraphs.forEach(paragraph => {
      if ((buffer + "\n\n" + paragraph).trim().length <= maxLength) {
        buffer = (buffer ? `${buffer}\n\n` : "") + paragraph;
        return;
      }

      if (buffer) {
        chunks.push(buffer);
        buffer = "";
      }

      for (let start = 0; start < paragraph.length; start += maxLength) {
        chunks.push(paragraph.slice(start, start + maxLength));
      }
    });

    if (buffer) chunks.push(buffer);
    return chunks;
  }

  function scoreChunk(chunk, tokens) {
    const haystack = chunk.toLocaleLowerCase("tr-TR");
    return tokens.reduce((score, token) => (
      haystack.includes(token.toLocaleLowerCase("tr-TR")) ? score + Math.max(1, token.length) : score
    ), 0);
  }

  function createBatchDocumentIndex(items, options = {}) {
    const maxMatches = options.maxMatches || 12;
    const documents = (items || [])
      .filter(item => !isExcelType(item?.data?.type))
      .map((item, fileIndex) => {
        const data = item.data || {};
        const text = normalizeText(item.text || data.fullText || data.sample);
        const chunks = createChunks(text).map((chunk, chunkIndex) => ({
          fileIndex,
          chunkIndex,
          fileName: item.fileName || data.name || `Dosya ${fileIndex + 1}`,
          type: data.type || "",
          text: chunk,
        }));

        return {
          fileName: item.fileName || data.name || `Dosya ${fileIndex + 1}`,
          type: data.type || "",
          manifest: buildFileManifest({ ...item, text }),
          chunks,
        };
      });

    const summaryContext = [
      "Toplu dosya manifestleri. Bu baglam ham tum metin degildir; hizli ozet icin kisaltilmis manifesttir.",
      ...documents.map((doc, index) => `\n--- Manifest ${index + 1} ---\n${doc.manifest}`)
    ].join("\n");

    function buildQuestionContext(question) {
      const tokens = tokenizeQuery(question);
      const scored = documents
        .flatMap(doc => doc.chunks)
        .map(chunk => ({ ...chunk, score: scoreChunk(chunk.text, tokens) }))
        .filter(chunk => chunk.score > 0)
        .sort((a, b) => b.score - a.score || a.fileIndex - b.fileIndex || a.chunkIndex - b.chunkIndex)
        .slice(0, maxMatches);

      if (scored.length === 0) {
        return [
          `Soru: ${question}`,
          "Yerel aramada eslesen belge parcasi bulunamadi.",
          "Asagida sadece dosya manifestleri var; kesin cevap yoksa bunu belirt.",
          summaryContext,
        ].join("\n\n");
      }

      return [
        `Soru: ${question}`,
        "Yerel arama sonucu bulunan ilgili belge parcalari. Sadece bu parcalara dayanarak cevap ver; yeterli bilgi yoksa belirt.",
        ...scored.map((chunk, index) => [
          `\n--- Eslesme ${index + 1} | ${chunk.fileName} | parca ${chunk.chunkIndex + 1} ---`,
          chunk.text,
        ].join("\n"))
      ].join("\n");
    }

    return { documents, summaryContext, buildQuestionContext };
  }

  const api = {
    createFilePickerActions,
    createBatchHistoryActions,
    createBatchDocumentIndex,
    createVoiceQuestionActions,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  if (root) {
    root.FilePeekActions = api;
  }
})(typeof window !== "undefined" ? window : null);
