const path = require("node:path");

function normalizePath(filePath) {
  if (typeof filePath !== "string" || !filePath.trim()) {
    return "";
  }

  return path.resolve(filePath);
}

function hasAllowedExtension(filePath, allowedExtensions) {
  if (!Array.isArray(allowedExtensions) || allowedExtensions.length === 0) {
    return true;
  }

  const ext = path.extname(filePath).toLowerCase();
  return allowedExtensions.map(item => String(item).toLowerCase()).includes(ext);
}

function createFileAccessGuard({
  supportedExtensions = [],
  fileExists = () => false,
  directoryExists = () => true,
} = {}) {
  const readablePaths = new Set();
  const writablePaths = new Set();

  function approveReadablePath(filePath) {
    const normalized = normalizePath(filePath);
    if (!normalized || !fileExists(normalized) || !hasAllowedExtension(normalized, supportedExtensions)) {
      return "";
    }

    readablePaths.add(normalized);
    writablePaths.add(normalized);
    return normalized;
  }

  function approveReadablePaths(filePaths = []) {
    return filePaths.map(approveReadablePath).filter(Boolean);
  }

  function approveWritablePath(filePath, allowedExtensions = []) {
    const normalized = normalizePath(filePath);
    if (!normalized || !hasAllowedExtension(normalized, allowedExtensions)) {
      return "";
    }

    const parentDir = path.dirname(normalized);
    if (!directoryExists(parentDir)) {
      return "";
    }

    writablePaths.add(normalized);
    return normalized;
  }

  function canRead(filePath) {
    const normalized = normalizePath(filePath);
    return Boolean(normalized && readablePaths.has(normalized));
  }

  function canWrite(filePath, allowedExtensions = []) {
    const normalized = normalizePath(filePath);
    return Boolean(
      normalized &&
      writablePaths.has(normalized) &&
      hasAllowedExtension(normalized, allowedExtensions)
    );
  }

  return {
    approveReadablePath,
    approveReadablePaths,
    approveWritablePath,
    canRead,
    canWrite,
    normalizePath,
  };
}

module.exports = {
  createFileAccessGuard,
  normalizePath,
};
