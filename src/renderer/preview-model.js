(function exposePreviewModel(root) {
  const TEXT_TYPES = new Set(["text", "txt", "md", "csv"]);
  const IMAGE_TYPES = new Set(["image", "jpg", "jpeg", "png", "gif", "webp", "bmp"]);
  const SPREADSHEET_TYPES = new Set(["xlsx", "xls"]);

  function getPreviewType(data = {}) {
    const type = String(data.type || "").toLowerCase();

    if (TEXT_TYPES.has(type)) return "text";
    if (IMAGE_TYPES.has(type)) return "image";
    if (SPREADSHEET_TYPES.has(type)) return "xlsx";
    if (["pdf", "docx", "zip", "udf"].includes(type)) return type;

    return type || "unknown";
  }

  function getReadablePreviewText(
    data = {},
    fallback = "Bu dosya icin okunabilir bir icerik bulunamadi."
  ) {
    const candidates = [data.sample, data.fullText];
    const normalized = candidates
      .map(candidate => (
        typeof candidate === "string"
          ? candidate.trim()
          : String(candidate || "").trim()
      ))
      .find(Boolean);

    return normalized || fallback;
  }

  const api = {
    getPreviewType,
    getReadablePreviewText,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  if (root) {
    root.FilePeekPreviewModel = api;
  }
})(typeof window !== "undefined" ? window : null);
