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

  it('rejects file with empty MIME type and no recognized extension', () => {
    const noTypeFile = new File([''], 'test', { type: '' });
    expect(isValidMediaType(noTypeFile)).toBe(false);
  });

  it('accepts image with empty MIME type via extension fallback (Android/MIUI)', () => {
    const androidJpg = new File([''], 'photo.jpg', { type: '' });
    expect(isValidMediaType(androidJpg)).toBe(true);

    const androidHeic = new File([''], 'photo.heic', { type: '' });
    expect(isValidMediaType(androidHeic)).toBe(true);

    const androidPng = new File([''], 'photo.png', { type: '' });
    expect(isValidMediaType(androidPng)).toBe(true);
  });

  it('accepts video with empty MIME type via extension fallback (Android/MIUI)', () => {
    const androidMp4 = new File([''], 'video.mp4', { type: '' });
    expect(isValidMediaType(androidMp4)).toBe(true);

    const android3gp = new File([''], 'video.3gp', { type: '' });
    expect(isValidMediaType(android3gp)).toBe(true);
  });

  it('is case-insensitive', () => {
    const upperFile = new File([''], 'test.jpg', { type: 'IMAGE/JPEG' });
    expect(isValidMediaType(upperFile)).toBe(true);

    const mixedFile = new File([''], 'test.mp4', { type: 'Video/Mp4' });
    expect(isValidMediaType(mixedFile)).toBe(true);
  });
});

describe('isValidMediaSize', () => {
  it('accepts image under 15MB', () => {
    const smallImage = new File(['x'.repeat(10 * 1024 * 1024)], 'small.jpg', { type: 'image/jpeg' });
    expect(isValidMediaSize(smallImage)).toBe(true);
  });

  it('accepts image exactly 15MB', () => {
    const maxImage = new File(['x'.repeat(15 * 1024 * 1024)], 'max.jpg', { type: 'image/jpeg' });
    expect(isValidMediaSize(maxImage)).toBe(true);
  });

  it('rejects image over 15MB', () => {
    const bigImage = new File(['x'.repeat(15 * 1024 * 1024 + 1)], 'big.jpg', { type: 'image/jpeg' });
    expect(isValidMediaSize(bigImage)).toBe(false);
  });

  it('accepts video under 200MB', () => {
    const smallVideo = new File(['x'.repeat(20 * 1024 * 1024)], 'small.mp4', { type: 'video/mp4' });
    expect(isValidMediaSize(smallVideo)).toBe(true);
  });

  it('accepts video exactly 200MB', () => {
    const maxVideo = new File(['x'.repeat(200 * 1024 * 1024)], 'max.mp4', { type: 'video/mp4' });
    expect(isValidMediaSize(maxVideo)).toBe(true);
  });

  it('rejects video over 200MB', () => {
    const bigVideo = new File(['x'.repeat(200 * 1024 * 1024 + 1)], 'big.mp4', { type: 'video/mp4' });
    expect(isValidMediaSize(bigVideo)).toBe(false);
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

  it('returns null for valid video under 200MB', () => {
    const validVideo = new File(['x'.repeat(20 * 1024 * 1024)], 'video.mp4', { type: 'video/mp4' });
    expect(getMediaValidationError(validVideo)).toBe(null);
  });

  it('returns type error for invalid file type', () => {
    const textFile = new File([''], 'test.txt', { type: 'text/plain' });
    expect(getMediaValidationError(textFile)).toBe('Arquivo inválido. Envie uma imagem ou vídeo.');
  });

  it('returns size error with correct limit for oversized image', () => {
    const bigImage = new File(['x'.repeat(16 * 1024 * 1024)], 'big.jpg', { type: 'image/jpeg' });
    expect(getMediaValidationError(bigImage)).toBe('Arquivo muito grande (máx 15MB).');
  });

  it('returns size error with correct limit for oversized video', () => {
    const bigVideo = new File(['x'.repeat(201 * 1024 * 1024)], 'big.mp4', { type: 'video/mp4' });
    expect(getMediaValidationError(bigVideo)).toBe('Arquivo muito grande (máx 200MB).');
  });

  it('prioritizes type error over size error', () => {
    const badFile = new File(['x'.repeat(16 * 1024 * 1024)], 'bad.txt', { type: 'text/plain' });
    expect(getMediaValidationError(badFile)).toBe('Arquivo inválido. Envie uma imagem ou vídeo.');
  });
});
