import { isValidMediaType, isValidMediaSize, getMediaValidationError } from './mediaValidators';

describe('isValidMediaType', () => {
  it('accepts image MIME types', () => {
    const imageFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
    expect(isValidMediaType(imageFile)).toBe(true);

    const pngFile = new File([''], 'test.png', { type: 'image/png' });
    expect(isValidMediaType(pngFile)).toBe(true);

    const webpFile = new File([''], 'test.webp', { type: 'image/webp' });
    expect(isValidMediaType(webpFile)).toBe(true);
  });

  it('accepts video MIME types', () => {
    const mp4File = new File([''], 'test.mp4', { type: 'video/mp4' });
    expect(isValidMediaType(mp4File)).toBe(true);

    const webmFile = new File([''], 'test.webm', { type: 'video/webm' });
    expect(isValidMediaType(webmFile)).toBe(true);

    const movFile = new File([''], 'test.mov', { type: 'video/quicktime' });
    expect(isValidMediaType(movFile)).toBe(true);
  });

  it('rejects non-media files', () => {
    const textFile = new File([''], 'test.txt', { type: 'text/plain' });
    expect(isValidMediaType(textFile)).toBe(false);

    const pdfFile = new File([''], 'test.pdf', { type: 'application/pdf' });
    expect(isValidMediaType(pdfFile)).toBe(false);

    const exeFile = new File([''], 'test.exe', { type: 'application/octet-stream' });
    expect(isValidMediaType(exeFile)).toBe(false);
  });

  it('handles empty MIME type', () => {
    const noTypeFile = new File([''], 'test', { type: '' });
    expect(isValidMediaType(noTypeFile)).toBe(false);
  });

  it('is case-insensitive', () => {
    const upperFile = new File([''], 'test.jpg', { type: 'IMAGE/JPEG' });
    expect(isValidMediaType(upperFile)).toBe(true);

    const mixedFile = new File([''], 'test.mp4', { type: 'Video/Mp4' });
    expect(isValidMediaType(mixedFile)).toBe(true);
  });
});

describe('isValidMediaSize', () => {
  it('accepts files under 15MB', () => {
    const smallFile = new File(['x'.repeat(1024 * 1024 * 10)], 'small.jpg', { type: 'image/jpeg' });
    expect(isValidMediaSize(smallFile)).toBe(true);
  });

  it('accepts files exactly 15MB', () => {
    const maxFile = new File(['x'.repeat(15 * 1024 * 1024)], 'max.mp4', { type: 'video/mp4' });
    expect(isValidMediaSize(maxFile)).toBe(true);
  });

  it('rejects files over 15MB', () => {
    const oversizedFile = new File(['x'.repeat(15 * 1024 * 1024 + 1)], 'big.mp4', { type: 'video/mp4' });
    expect(isValidMediaSize(oversizedFile)).toBe(false);
  });

  it('accepts empty files', () => {
    const emptyFile = new File([''], 'empty.jpg', { type: 'image/jpeg' });
    expect(isValidMediaSize(emptyFile)).toBe(true);
  });
});

describe('getMediaValidationError', () => {
  it('returns null for valid image', () => {
    const validImage = new File([''], 'photo.jpg', { type: 'image/jpeg' });
    expect(getMediaValidationError(validImage)).toBe(null);
  });

  it('returns null for valid video under 15MB', () => {
    const validVideo = new File(['x'.repeat(5 * 1024 * 1024)], 'video.mp4', { type: 'video/mp4' });
    expect(getMediaValidationError(validVideo)).toBe(null);
  });

  it('returns type error for invalid file type', () => {
    const textFile = new File([''], 'test.txt', { type: 'text/plain' });
    expect(getMediaValidationError(textFile)).toBe('Arquivo inválido. Envie uma imagem ou vídeo.');
  });

  it('returns size error for oversized file', () => {
    const bigFile = new File(['x'.repeat(16 * 1024 * 1024)], 'big.mp4', { type: 'video/mp4' });
    expect(getMediaValidationError(bigFile)).toBe('Arquivo muito grande (máx 15MB).');
  });

  it('prioritizes type error over size error', () => {
    const badFile = new File(['x'.repeat(16 * 1024 * 1024)], 'bad.txt', { type: 'text/plain' });
    // Type is checked first, so we should get the type error
    expect(getMediaValidationError(badFile)).toBe('Arquivo inválido. Envie uma imagem ou vídeo.');
  });
});
