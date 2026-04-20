(function exposeExcelSearch(root) {
  const workbookIndexCache = new WeakMap();
  const NOISE_TERMS = new Set([
    "ne",
    "nedir",
    "hangi",
    "kac",
    "kaç",
    "nosu",
    "no",
    "numara",
    "numarasi",
    "numarası",
    "kimlik",
    "tc",
    "tckn",
    "ilgili",
    "dt",
    "d",
    "t",
  ]);

  function normalizeText(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/ı/g, "i")
      .replace(/İ/g, "i")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function extractSearchPhrase(question) {
    const quoted = String(question || "").match(/["“”']([^"“”']+)["“”']/);
    if (quoted?.[1]) {
      return quoted[1].trim();
    }

    const cleaned = String(question || "")
      .replace(/[?.,;:()[\]{}"/\\]+/g, " ")
      .replace(/\bD\.T\b/gi, " ")
      .replace(/\s+/g, " ")
      .trim();

    const tokens = cleaned
      .split(" ")
      .filter(Boolean)
      .filter((token) => !NOISE_TERMS.has(normalizeText(token)));

    return tokens.join(" ").trim();
  }

  function getCellText(cell) {
    if (!cell) return "";
    if (typeof cell === "string") return cell;
    return cell.displayValue || cell.value || "";
  }

  function rowToText(row) {
    return row.map(getCellText).join(" | ");
  }

  function buildRowObject(headers, row) {
    const values = {};
    row.forEach((cell, index) => {
      const header = headers[index] || `Kolon ${index + 1}`;
      values[header] = getCellText(cell);
    });
    return values;
  }

  function buildWorkbookSearchIndex(workbookData) {
    const sheets = Array.isArray(workbookData?.sheetData) ? workbookData.sheetData : [];

    return {
      sheets: sheets.map((sheet) => {
        const rows = Array.isArray(sheet.rows) ? sheet.rows : [];
        const headers = rows[0]?.map(getCellText) || [];

        return {
          name: sheet.name,
          headers,
          rows: rows.slice(1).map((row, rowIndex) => ({
            row,
            rowIndex: rowIndex + 1,
            rowNumber: rowIndex + 2,
            joinedText: normalizeText(rowToText(row)),
          })),
        };
      }),
    };
  }

  function getWorkbookSearchIndex(workbookData) {
    if (!workbookData || typeof workbookData !== "object") {
      return { sheets: [] };
    }

    const cached = workbookIndexCache.get(workbookData);
    if (cached) return cached;

    const index = buildWorkbookSearchIndex(workbookData);
    workbookIndexCache.set(workbookData, index);
    return index;
  }

  function scoreRowMatch(row, normalizedPhrase, phraseTokens) {
    const joined = typeof row === "string" ? row : normalizeText(rowToText(row));
    if (!joined) return 0;
    if (normalizedPhrase && joined.includes(normalizedPhrase)) return 1000 + normalizedPhrase.length;

    let score = 0;
    for (const token of phraseTokens) {
      if (token && joined.includes(token)) score += 10;
    }
    return score;
  }

  function buildFocusedExcelQuestionContext(workbookData, question, options = {}) {
    const searchPhrase = extractSearchPhrase(question);
    const normalizedPhrase = normalizeText(searchPhrase);
    const phraseTokens = normalizedPhrase.split(" ").filter(Boolean);
    const contextRadius = options.contextRadius ?? 1;
    const maxMatches = options.maxMatches ?? 3;
    const sheets = Array.isArray(workbookData?.sheetData) ? workbookData.sheetData : [];
    const workbookIndex = getWorkbookSearchIndex(workbookData);

    const matches = [];

    workbookIndex.sheets.forEach((indexedSheet, sheetIndex) => {
      const sheet = sheets[sheetIndex];
      const rows = Array.isArray(sheet.rows) ? sheet.rows : [];
      if (!rows.length) return;

      const headers = indexedSheet.headers;
      indexedSheet.rows.forEach(({ row, rowIndex, rowNumber, joinedText }) => {
        const score = scoreRowMatch(joinedText, normalizedPhrase, phraseTokens);
        if (!score) return;

        matches.push({
          score,
          sheetName: indexedSheet.name,
          rowIndex,
          rowNumber,
          headers,
          values: buildRowObject(headers, row),
          nearbyRows: rows.slice(
            Math.max(1, rowIndex - contextRadius),
            Math.min(rows.length, rowIndex + contextRadius + 1)
          ).map((nearbyRow, offsetIndex) => {
            const actualIndex = Math.max(1, rowIndex - contextRadius) + offsetIndex;
            return {
              rowNumber: actualIndex + 1,
              values: buildRowObject(headers, nearbyRow),
            };
          }),
        });
      });
    });

    matches.sort((left, right) => right.score - left.score);
    const limited = matches.slice(0, maxMatches);

    let contextText = "=== EŞLEŞME SONUÇLARI ===\n";
    contextText += `Soru: ${question}\n`;
    contextText += `Aranan ifade: ${searchPhrase || question}\n`;

    if (!limited.length) {
      contextText += "Durum: Eşleşme bulunamadı.\n";
      return { searchPhrase, matches: [], contextText };
    }

    limited.forEach((match, index) => {
      contextText += `\n--- EŞLEŞME ${index + 1} ---\n`;
      contextText += `Sayfa: ${match.sheetName}\n`;
      contextText += `Satır: ${match.rowNumber}\n`;
      contextText += `Basliklar: ${match.headers.join(" | ")}\n`;
      contextText += "Satir Verisi:\n";
      Object.entries(match.values).forEach(([key, value]) => {
        contextText += `- ${key}: ${value}\n`;
      });
      contextText += "Yakin Baglam:\n";
      match.nearbyRows.forEach((nearbyRow) => {
        const serialized = Object.entries(nearbyRow.values)
          .map(([key, value]) => `${key}: ${value}`)
          .join(" | ");
        contextText += `[Satır ${nearbyRow.rowNumber}] ${serialized}\n`;
      });
    });

    return {
      searchPhrase,
      matches: limited,
      contextText,
    };
  }

  const api = {
    extractSearchPhrase,
    getWorkbookSearchIndex,
    buildFocusedExcelQuestionContext,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  if (root) {
    root.FilePeekExcelSearch = api;
  }
})(typeof window !== "undefined" ? window : null);
