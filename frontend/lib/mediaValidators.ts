const MAX_IMAGE_SIZE = 15 * 1024 * 1024; // 15MB
const MAX_VIDEO_SIZE = 30 * 1024 * 1024; // 30MB

export function isValidMediaType(file: File): boolean {
  const mimeType = (file.type || "").toLowerCase();
  return mimeType.startsWith("image/") || mimeType.startsWith("video/");
}

export function isValidMediaSize(file: File): boolean {
  const mimeType = (file.type || "").toLowerCase();
  const limit = mimeType.startsWith("video/") ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
  return file.size <= limit;
}

export function getMediaValidationError(file: File): string | null {
  if (!isValidMediaType(file)) {
    return "Arquivo inválido. Envie uma imagem ou vídeo.";
  }
  if (!isValidMediaSize(file)) {
    const mimeType = (file.type || "").toLowerCase();
    const label = mimeType.startsWith("video/") ? "30MB" : "15MB";
    return `Arquivo muito grande (máx ${label}).`;
  }
  return null;
}
