const XLSX = require("@e965/xlsx");

const EXCEL_PREVIEW_ROW_LIMIT = 12;
const EXCEL_SAMPLE_ROW_LIMIT = 200;
const EXCEL_AI_ROW_LIMIT = 200;
const EXCEL_MAX_CELL_TEXT = 160;

function stringifyCellValue(value) {
  if (value === undefined || value === null) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function normalizeCellText(text) {
  return stringifyCellValue(text).replace(/\s+/g, " ").trim();
}

function getFormattedCellValue(cell) {
  if (!cell) return "";
  if (cell.w !== undefined && cell.w !== null && String(cell.w).trim() !== "") {
    return String(cell.w);
  }
  if (cell.v !== undefined && cell.v !== null) {
    return stringifyCellValue(cell.v);
  }
  return "";
}

function readSheetGrid(sheet) {
  if (!sheet || !sheet["!ref"]) return [];

  const range = XLSX.utils.decode_range(sheet["!ref"]);
  const rows = [];

  for (let r = range.s.r; r <= range.e.r; r += 1) {
    const row = [];
    let hasContent = false;

    for (let c = range.s.c; c <= range.e.c; c += 1) {
      const address = XLSX.utils.encode_cell({ r, c });
      const cell = sheet[address];
      const formatted = getFormattedCellValue(cell);
      const formula = cell?.f ? `=${cell.f}` : "";
      const value = formula || formatted;

      if (value !== "") {
        hasContent = true;
      }

      row.push({
        value,
        displayValue: formatted,
        formula,
      });
    }

    if (hasContent) {
      rows.push(row);
    }
  }

  return rows;
}

function formatCellForAi(cell) {
  if (!cell) return "";

  const displayValue = normalizeCellText(cell.displayValue);
  const formula = normalizeCellText(cell.formula);

  if (formula && displayValue && displayValue !== formula) {
    return `${displayValue} {formul: ${formula}}`.slice(0, EXCEL_MAX_CELL_TEXT);
  }

  return (formula || displayValue).slice(0, EXCEL_MAX_CELL_TEXT);
}

function toPreviewRows(rows, limit = EXCEL_PREVIEW_ROW_LIMIT) {
  return rows.slice(0, limit).map((row) =>
    row.map((cell) => cell?.displayValue || cell?.value || "")
  );
}

function buildWorkbookText(sheetEntries) {
  let fullText = "";
  let sampleText = "";
  let totalRows = 0;

  sheetEntries.forEach((entry, index) => {
    const { name, rows } = entry;
    totalRows += rows.length;

    fullText += `\n\n=== SAYFA ${index + 1}: ${name} ===\n`;
    fullText += `Toplam Satir: ${rows.length}\n`;
    fullText += `AI baglami: ilk ${Math.min(rows.length, EXCEL_AI_ROW_LIMIT)} satir ornegi, tam ham tablo degil.\n\n`;

    rows.slice(0, EXCEL_AI_ROW_LIMIT).forEach((row, rowIndex) => {
      const content = row.map(formatCellForAi).filter(Boolean).join(" | ");
      fullText += `[Satir ${rowIndex + 1}] ${content}\n`;
    });

    if (rows.length > EXCEL_AI_ROW_LIMIT) {
      fullText += `... (${rows.length - EXCEL_AI_ROW_LIMIT} satir daha var)\n`;
    }

    sampleText += `\n\n=== SAYFA ${index + 1}: ${name} ===\n`;
    sampleText += `Toplam Satir: ${rows.length}\n`;
    sampleText += `AI ozeti icin orneklem: ilk ${Math.min(rows.length, EXCEL_SAMPLE_ROW_LIMIT)} satir.\n`;

    rows.slice(0, EXCEL_SAMPLE_ROW_LIMIT).forEach((row, rowIndex) => {
      const content = row.map(formatCellForAi).filter(Boolean).join(" | ");
      sampleText += `[Satir ${rowIndex + 1}] ${content}\n`;
    });

    if (rows.length > EXCEL_SAMPLE_ROW_LIMIT) {
      sampleText += `... (${rows.length - EXCEL_SAMPLE_ROW_LIMIT} satir daha var)\n`;
    }
  });

  return { fullText, sampleText, totalRows };
}

function extractWorkbookData(buffer) {
  const workbook = XLSX.read(buffer, {
    type: "buffer",
    cellFormula: true,
    cellNF: true,
    cellText: true,
    cellDates: true,
  });

  const sheetEntries = workbook.SheetNames.map((sheetName) => ({
    name: sheetName,
    rows: readSheetGrid(workbook.Sheets[sheetName]),
  }));

  const firstSheetRows = sheetEntries[0]?.rows || [];
  const { fullText, sampleText, totalRows } = buildWorkbookText(sheetEntries);

  return {
    type: "xlsx",
    sheets: workbook.SheetNames,
    rows: toPreviewRows(firstSheetRows),
    editorRows: firstSheetRows,
    sheetData: sheetEntries,
    totalSheets: workbook.SheetNames.length,
    totalRows,
    sample: sampleText,
    fullText,
  };
}

function parseCellValue(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value === "number") {
    return { t: "n", v: value };
  }

  if (typeof value === "boolean") {
    return { t: "b", v: value };
  }

  const text = String(value);
  if (text.startsWith("=") && text.length > 1) {
    return { f: text.slice(1) };
  }

  const numericValue = Number(text);
  if (text.trim() !== "" && Number.isFinite(numericValue) && /^-?\d+(\.\d+)?$/.test(text.trim())) {
    return { t: "n", v: numericValue };
  }

  return { t: "s", v: text };
}

function createWorksheetFromGrid(grid) {
  const worksheet = {};
  let maxRow = -1;
  let maxCol = -1;

  grid.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      const rawValue = cell && typeof cell === "object" && "value" in cell ? cell.value : cell;
      const parsed = parseCellValue(rawValue);
      if (!parsed) return;

      const address = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
      worksheet[address] = parsed;
      maxRow = Math.max(maxRow, rowIndex);
      maxCol = Math.max(maxCol, colIndex);
    });
  });

  if (maxRow >= 0 && maxCol >= 0) {
    worksheet["!ref"] = XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: maxRow, c: maxCol },
    });
  } else {
    worksheet["!ref"] = "A1";
  }

  return worksheet;
}

function createWorkbookFromSheets(sheets) {
  const workbook = XLSX.utils.book_new();
  const normalizedSheets = Array.isArray(sheets) && sheets.length
    ? sheets
    : [{ name: "Sheet1", rows: [] }];

  normalizedSheets.forEach((sheet, index) => {
    const sheetName = String(sheet?.name || `Sheet${index + 1}`).slice(0, 31) || `Sheet${index + 1}`;
    const worksheet = createWorksheetFromGrid(sheet?.rows || []);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  });

  return workbook;
}

module.exports = {
  EXCEL_AI_ROW_LIMIT,
  EXCEL_PREVIEW_ROW_LIMIT,
  createWorkbookFromSheets,
  createWorksheetFromGrid,
  extractWorkbookData,
};

