const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

/**
 * Check if file has valid MIME type (image/* or video/*)
 */
export function isValidMediaType(file: File): boolean {
  const mimeType = (file.type || "").toLowerCase();
  return mimeType.startsWith("image/") || mimeType.startsWith("video/");
}

/**
 * Check if file size <= 15MB
 */
export function isValidMediaSize(file: File): boolean {
  return file.size <= MAX_FILE_SIZE;
}

/**
 * Return user-friendly error message for invalid file, or null if valid
 * Examples:
 *   - "Arquivo inválido. Envie uma imagem ou vídeo."
 *   - "Arquivo muito grande (máx 15MB)."
 *   - null (if valid)
 */
export function getMediaValidationError(file: File): string | null {
  if (!isValidMediaType(file)) {
    return "Arquivo inválido. Envie uma imagem ou vídeo.";
  }
  if (!isValidMediaSize(file)) {
    return "Arquivo muito grande (máx 15MB).";
  }
  return null;
}
