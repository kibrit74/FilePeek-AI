(function exposeExcelVirtualization(root) {
  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function calculateVisibleRange({
    rowCount,
    rowHeight,
    viewportHeight,
    scrollTop,
    overscan = 4,
  }) {
    const safeRowCount = Math.max(0, Number(rowCount) || 0);
    const safeRowHeight = Math.max(1, Number(rowHeight) || 1);
    const safeViewportHeight = Math.max(safeRowHeight, Number(viewportHeight) || safeRowHeight);
    const safeScrollTop = Math.max(0, Number(scrollTop) || 0);
    const safeOverscan = Math.max(0, Number(overscan) || 0);
    const totalHeight = safeRowCount * safeRowHeight;

    if (!safeRowCount) {
      return {
        startRow: 0,
        endRow: -1,
        paddingTop: 0,
        paddingBottom: 0,
        totalHeight: 0,
      };
    }

    const visibleRowCount = Math.max(1, Math.ceil(safeViewportHeight / safeRowHeight));
    const firstVisibleRow = clamp(
      Math.floor(safeScrollTop / safeRowHeight),
      0,
      safeRowCount - 1
    );
    const lastVisibleRow = clamp(
      firstVisibleRow + visibleRowCount - 1,
      0,
      safeRowCount - 1
    );
    const startRow = Math.max(0, firstVisibleRow - safeOverscan);
    const endRow = Math.min(safeRowCount - 1, lastVisibleRow + safeOverscan);
    const paddingTop = startRow * safeRowHeight;
    const paddingBottom = Math.max(0, (safeRowCount - endRow - 1) * safeRowHeight);

    return {
      startRow,
      endRow,
      paddingTop,
      paddingBottom,
      totalHeight,
    };
  }

  const api = {
    calculateVisibleRange,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  if (root) {
    root.FilePeekExcelVirtualization = api;
  }
})(typeof window !== "undefined" ? window : null);
