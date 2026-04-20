(function exposeExcelFormulas(root) {
  function getCellText(cell) {
    if (!cell) return "";
    if (typeof cell === "string" || typeof cell === "number") return String(cell);
    return cell.displayValue || cell.value || "";
  }

  function columnNameToIndex(name) {
    return String(name || "")
      .toUpperCase()
      .split("")
      .reduce((total, char) => total * 26 + (char.charCodeAt(0) - 64), 0) - 1;
  }

  function getNumericCellValue(grid, ref) {
    const match = String(ref || "").match(/^([A-Z]+)(\d+)$/i);
    if (!match) return 0;

    const col = columnNameToIndex(match[1]);
    const row = Number(match[2]) - 1;
    const value = Number.parseFloat(getCellText(grid[row]?.[col]).replace(",", "."));
    return Number.isFinite(value) ? value : 0;
  }

  function collectRangeValues(grid, startCol, startRow, endCol, endRow) {
    const startC = columnNameToIndex(startCol);
    const endC = columnNameToIndex(endCol);
    const startR = Number(startRow) - 1;
    const endR = Number(endRow) - 1;
    const values = [];

    for (let row = Math.min(startR, endR); row <= Math.max(startR, endR); row += 1) {
      for (let col = Math.min(startC, endC); col <= Math.max(startC, endC); col += 1) {
        const value = Number.parseFloat(getCellText(grid[row]?.[col]).replace(",", "."));
        if (Number.isFinite(value)) values.push(value);
      }
    }

    return values;
  }

  function calculateRange(grid, formula, operation) {
    const match = formula.match(/^[A-Z]+\(([A-Z]+)(\d+):([A-Z]+)(\d+)\)$/i);
    if (!match) return "#HATA!";

    const [, startCol, startRow, endCol, endRow] = match;
    const values = collectRangeValues(grid, startCol, startRow, endCol, endRow);

    if (operation === "sum") return values.reduce((sum, value) => sum + value, 0);
    if (operation === "count") return values.length;
    if (operation === "avg") {
      return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
    }

    return "#HATA!";
  }

  function tokenizeArithmetic(expression) {
    const tokens = [];
    const pattern = /\s*(\d+(?:\.\d+)?|[()+\-*/])\s*/gy;
    let index = 0;
    let match;

    while ((match = pattern.exec(expression)) !== null) {
      if (match.index !== index) return null;
      tokens.push(match[1]);
      index = pattern.lastIndex;
    }

    if (index !== expression.length) return null;
    return tokens;
  }

  function parseArithmetic(tokens) {
    let index = 0;

    function peek() {
      return tokens[index];
    }

    function consume() {
      const token = tokens[index];
      index += 1;
      return token;
    }

    function parseFactor() {
      const token = peek();

      if (token === "-") {
        consume();
        return -parseFactor();
      }

      if (token === "+") {
        consume();
        return parseFactor();
      }

      if (token === "(") {
        consume();
        const value = parseExpression();
        if (consume() !== ")") throw new Error("Unclosed expression");
        return value;
      }

      if (!/^\d+(?:\.\d+)?$/.test(token || "")) {
        throw new Error("Invalid token");
      }

      return Number(consume());
    }

    function parseTerm() {
      let value = parseFactor();
      while (peek() === "*" || peek() === "/") {
        const operator = consume();
        const right = parseFactor();
        value = operator === "*" ? value * right : value / right;
      }
      return value;
    }

    function parseExpression() {
      let value = parseTerm();
      while (peek() === "+" || peek() === "-") {
        const operator = consume();
        const right = parseTerm();
        value = operator === "+" ? value + right : value - right;
      }
      return value;
    }

    const value = parseExpression();
    if (index !== tokens.length || !Number.isFinite(value)) {
      throw new Error("Invalid expression");
    }

    return value;
  }

  function evaluateFormula(formula, grid) {
    try {
      if (typeof formula !== "string" || !formula.startsWith("=")) return formula;

      const expr = formula.slice(1).trim().toUpperCase();
      if (!expr) return "#HATA!";

      if (expr.startsWith("SUM(")) return calculateRange(grid, expr, "sum");
      if (expr.startsWith("AVERAGE(") || expr.startsWith("AVG(")) return calculateRange(grid, expr, "avg");
      if (expr.startsWith("COUNT(")) return calculateRange(grid, expr, "count");

      const substituted = expr.replace(/\b[A-Z]+\d+\b/g, ref => String(getNumericCellValue(grid, ref)));
      const tokens = tokenizeArithmetic(substituted);
      if (!tokens || tokens.length === 0) return "#HATA!";

      return parseArithmetic(tokens);
    } catch (_error) {
      return "#HATA!";
    }
  }

  const api = { evaluateFormula };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  if (root) {
    root.FilePeekExcelFormulas = api;
  }
})(typeof window !== "undefined" ? window : null);
