/**
 * Valida CPF com algoritmo de dígito verificador.
 * Rejeita sequências repetidas (ex: 000...0) e CPFs com comprimento errado.
 */
export function isValidCPF(cpf: string): boolean {
  const cleaned = cpf.replace(/\D/g, "");
  if (cleaned.length !== 11) return false;
  if (/^(\d)\1+$/.test(cleaned)) return false; // todos iguais (ex: 00000000000)

  const calc = (digits: string, factor: number): number =>
    digits.split("").reduce((sum, d, i) => sum + parseInt(d, 10) * (factor - i), 0);

  const r1 = (calc(cleaned.slice(0, 9), 10) * 10) % 11;
  if ((r1 === 10 || r1 === 11 ? 0 : r1) !== parseInt(cleaned[9], 10)) return false;

  const r2 = (calc(cleaned.slice(0, 10), 11) * 10) % 11;
  return (r2 === 10 || r2 === 11 ? 0 : r2) === parseInt(cleaned[10], 10);
}

const ALLOWED_IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp", "image/heic"];
const ALLOWED_VIDEO_MIMES = ["video/mp4", "video/quicktime", "video/webm"];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;  // 5 MB
const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50 MB

/**
 * Valida tipo MIME e tamanho de upload.
 * Retorna mensagem de erro se inválido, null se válido.
 */
export function validateUpload(
  mimetype: string,
  size: number,
  allowVideo = false
): string | null {
  const allowed = allowVideo
    ? [...ALLOWED_IMAGE_MIMES, ...ALLOWED_VIDEO_MIMES]
    : ALLOWED_IMAGE_MIMES;

  if (!allowed.includes(mimetype)) {
    return `Tipo de arquivo não permitido: ${mimetype}`;
  }

  const maxSize = ALLOWED_VIDEO_MIMES.includes(mimetype) ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;

  if (size > maxSize) {
    return `Arquivo muito grande. Máximo: ${maxSize / 1024 / 1024}MB`;
  }

  return null;
}
