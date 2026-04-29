const MAX_IMAGE_SIZE = 15 * 1024 * 1024; // 15MB
const MAX_VIDEO_SIZE = 200 * 1024 * 1024; // 200MB

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp", "heic", "heif", "bmp", "avif"]);
const VIDEO_EXTENSIONS = new Set(["mp4", "mov", "avi", "mkv", "webm", "3gp"]);

function getFileExtension(file: File): string {
  return file.name.split(".").pop()?.toLowerCase() ?? "";
}

export function isValidMediaType(file: File): boolean {
  const mimeType = (file.type || "").toLowerCase();
  if (mimeType) {
    return mimeType.startsWith("image/") || mimeType.startsWith("video/");
  }
  // Fallback por extensão: Android/MIUI frequentemente retorna file.type vazio
  const ext = getFileExtension(file);
  return IMAGE_EXTENSIONS.has(ext) || VIDEO_EXTENSIONS.has(ext);
}

function isVideoFile(file: File): boolean {
  const mimeType = (file.type || "").toLowerCase();
  if (mimeType) return mimeType.startsWith("video/");
  return VIDEO_EXTENSIONS.has(getFileExtension(file));
}

export function isValidMediaSize(file: File): boolean {
  const limit = isVideoFile(file) ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
  return file.size <= limit;
}

export function getMediaValidationError(file: File): string | null {
  if (!isValidMediaType(file)) {
    return "Arquivo inválido. Envie uma imagem ou vídeo.";
  }
  if (!isValidMediaSize(file)) {
    const label = isVideoFile(file) ? "200MB" : "15MB";
    return `Arquivo muito grande (máx ${label}).`;
  }
  return null;
}
