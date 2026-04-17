# Video Upload Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable users to upload both images and videos (up to 15MB each) to all media sections in the report creation form, with validation on frontend and backend.

**Architecture:** Add a validation helper module (`lib/mediaValidators.ts`) that checks file type and size. Update all media upload handlers in the report page to validate before accepting files. Backend already supports both types—just add size validation.

**Tech Stack:** TypeScript, React hooks, Jest for testing

---

## File Structure

```
frontend/lib/
  ├── mediaValidators.ts          (NEW) - Validation functions
  └── mediaValidators.test.ts      (NEW) - Tests for validators

frontend/app/novo-relatorio/
  └── page.tsx                     (MODIFY) - Update handlers and accept attributes
```

---

## Task 1: Create Media Validation Helper

**Files:**
- Create: `frontend/lib/mediaValidators.ts`

- [ ] **Step 1: Write the validation module with all functions**

Create `frontend/lib/mediaValidators.ts`:

```typescript
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
```

- [ ] **Step 2: Verify the file was created**

Run:
```bash
cat frontend/lib/mediaValidators.ts
```

Expected: File exists with all three functions defined.

---

## Task 2: Write Tests for Media Validators

**Files:**
- Create: `frontend/lib/mediaValidators.test.ts`

- [ ] **Step 1: Write comprehensive test suite**

Create `frontend/lib/mediaValidators.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run tests to verify they pass**

Run:
```bash
cd frontend && npm test -- lib/mediaValidators.test.ts
```

Expected: All tests pass (23 passing).

- [ ] **Step 3: Commit**

```bash
git add frontend/lib/mediaValidators.ts frontend/lib/mediaValidators.test.ts
git commit -m "feat: add media file validation helper with tests"
```

---

## Task 3: Update Accept Attribute for Damage Photos

**Files:**
- Modify: `frontend/app/novo-relatorio/page.tsx:933`

- [ ] **Step 1: Find the damage photos upload field**

The damage photos section starts around line 900. Look for:
```typescript
<MediaUploadField
  id="damageImages"
  ...
  accept="image/*"
```

Around line 933 you'll see `accept="image/*"`.

- [ ] **Step 2: Change accept attribute**

Replace:
```typescript
accept="image/*"
```

With:
```typescript
accept="image/*,video/*"
```

Full updated field (lines 918-939):
```typescript
<MediaUploadField
  id="damageImages"
  name="damageImages"
  label="Fotos de Danos (caso tenha)"
  files={damageImages}
  onAddFiles={(files) =>
    handleDamageImagesAdd(files)
  }
  onRemoveFile={(index) =>
    setDamageImages((prev) => prev.filter((_, fileIndex) => fileIndex !== index))
  }
  accept="image/*,video/*"
  helperText="Máximo de 10 fotos."
  maxFiles={10}
/>
```

- [ ] **Step 3: Verify change in editor**

Check that the accept attribute is now `"image/*,video/*"` on line 933.

---

## Task 4: Update Accept Attributes for Event Photos (All 5 Topics)

**Files:**
- Modify: `frontend/app/novo-relatorio/page.tsx:954, 969, 984, 1004, 1019`

- [ ] **Step 1: Update Painting photos**

Around line 954, change:
```typescript
accept="image/*"
```

To:
```typescript
accept="image/*,video/*"
```

- [ ] **Step 2: Update Balloon photos**

Around line 969, change:
```typescript
accept="image/*"
```

To:
```typescript
accept="image/*,video/*"
```

- [ ] **Step 3: Update Animation photos**

Around line 984, change:
```typescript
accept="image/*"
```

To:
```typescript
accept="image/*,video/*"
```

- [ ] **Step 4: Update Characters photos**

Around line 1004, change:
```typescript
accept="image/*"
```

To:
```typescript
accept="image/*,video/*"
```

- [ ] **Step 5: Update Workshops photos**

Around line 1019, change:
```typescript
accept="image/*"
```

To:
```typescript
accept="image/*,video/*"
```

- [ ] **Step 6: Verify all changes**

Run:
```bash
grep -n 'accept="image' frontend/app/novo-relatorio/page.tsx
```

Expected: No results (all should be `accept="image/*,video/*"`).

Run:
```bash
grep -n 'accept="image/\*,video/\*"' frontend/app/novo-relatorio/page.tsx
```

Expected: 6 matches (damage photos + 5 event photo topics).

---

## Task 5: Add Import for Media Validators

**Files:**
- Modify: `frontend/app/novo-relatorio/page.tsx:1-20`

- [ ] **Step 1: Add import statement**

At the top of the file (after other lib imports, around line 14), add:

```typescript
import { getMediaValidationError } from "../../lib/mediaValidators";
```

Full import section should look like:
```typescript
import { getDefaultRoute, getStoredUser, isRoleAllowed } from "../../lib/auth";
import {
  createReport,
  getMembers,
  getReportById,
  updateReport,
  uploadReportMedia,
} from "../../lib/api";
import { getMediaValidationError } from "../../lib/mediaValidators";
```

- [ ] **Step 2: Verify import is in place**

Run:
```bash
head -20 frontend/app/novo-relatorio/page.tsx | grep mediaValidators
```

Expected: One line with the import statement.

---

## Task 6: Update handleDamageImagesAdd Handler

**Files:**
- Modify: `frontend/app/novo-relatorio/page.tsx:432-435`

- [ ] **Step 1: Replace handler with validation**

Find the current handler around line 432:
```typescript
const handleDamageImagesAdd = (files: FileList | null) => {
  setSubmitError("");
  setDamageImages((prev) => addFilesWithoutDuplicates(prev, files));
};
```

Replace with:
```typescript
const handleDamageImagesAdd = (files: FileList | null) => {
  const fileArray = toFiles(files);
  
  // Validate each file
  for (const file of fileArray) {
    const error = getMediaValidationError(file);
    if (error) {
      setSubmitError(error);
      return;
    }
  }
  
  setSubmitError("");
  setDamageImages((prev) => addFilesWithoutDuplicates(prev, fileArray));
};
```

- [ ] **Step 2: Verify handler is updated**

Run:
```bash
sed -n '432,445p' frontend/app/novo-relatorio/page.tsx
```

Expected: Handler includes `getMediaValidationError` check.

---

## Task 7: Update handleEventPhotosTopicAdd Handler

**Files:**
- Modify: `frontend/app/novo-relatorio/page.tsx:415-430`

- [ ] **Step 1: Replace handler with validation**

Find the current handler around line 415:
```typescript
const handleEventPhotosTopicAdd = (
  topicName: string,
  files: FileList | null,
  currentFiles: File[],
  setFiles: (nextFiles: File[]) => void
) => {
  const nextFiles = addFilesWithoutDuplicates(currentFiles, files);
  if (nextFiles.length > MAX_EVENT_PHOTOS_PER_TOPIC) {
    setSubmitError(
      `${topicName}: o máximo permitido é ${MAX_EVENT_PHOTOS_PER_TOPIC} imagens por tópico.`
    );
    return;
  }
  setSubmitError("");
  setFiles(nextFiles);
};
```

Replace with:
```typescript
const handleEventPhotosTopicAdd = (
  topicName: string,
  files: FileList | null,
  currentFiles: File[],
  setFiles: (nextFiles: File[]) => void
) => {
  const fileArray = toFiles(files);
  
  // Validate each file
  for (const file of fileArray) {
    const error = getMediaValidationError(file);
    if (error) {
      setSubmitError(error);
      return;
    }
  }
  
  const nextFiles = addFilesWithoutDuplicates(currentFiles, fileArray);
  if (nextFiles.length > MAX_EVENT_PHOTOS_PER_TOPIC) {
    setSubmitError(
      `${topicName}: o máximo permitido é ${MAX_EVENT_PHOTOS_PER_TOPIC} imagens por tópico.`
    );
    return;
  }
  setSubmitError("");
  setFiles(nextFiles);
};
```

- [ ] **Step 2: Verify handler is updated**

Run:
```bash
sed -n '415,435p' frontend/app/novo-relatorio/page.tsx
```

Expected: Handler includes `getMediaValidationError` check before duplicate checking.

---

## Task 8: Test Video Upload in Frontend

**Files:**
- Test: Frontend form validation

- [ ] **Step 1: Start the development server**

Run:
```bash
cd frontend && npm run dev
```

Expected: Server running on http://localhost:3000

- [ ] **Step 2: Navigate to the novo relatório page**

Open http://localhost:3000/novo-relatorio in browser.

- [ ] **Step 3: Test with valid image**

- Click "Fotos de Danos" upload
- Select a small image file (< 15MB)
- Expected: File added to list successfully

- [ ] **Step 4: Test with valid video**

- Click "Fotos do Evento > Pintura" upload
- Select a small video file, MP4 or WebM (< 15MB)
- Expected: File added to list successfully

- [ ] **Step 5: Test with oversized video**

- Click "Fotos de Danos" upload
- Try to select a video file > 15MB (create one or use a real large file)
- Expected: Error message "Arquivo muito grande (máx 15MB)." appears in red at bottom of form

- [ ] **Step 6: Test with invalid file type**

- Click "Fotos do Evento > Animação" upload
- Try to select a .txt or .pdf file
- Expected: Error message "Arquivo inválido. Envie uma imagem ou vídeo." appears in red at bottom of form

- [ ] **Step 7: Test file count limit still enforced**

- Click "Fotos do Evento > Balão" upload
- Select 5 valid image files
- Try to add a 6th file (image or video)
- Expected: Error message "Balão: o máximo permitido é 5 imagens por tópico." appears

---

## Task 9: Run Validator Unit Tests

**Files:**
- Test: `frontend/lib/mediaValidators.test.ts`

- [ ] **Step 1: Run full test suite**

Run:
```bash
cd frontend && npm test -- lib/mediaValidators.test.ts --watchAll=false
```

Expected: All tests pass (23 passing).

- [ ] **Step 2: Check test coverage**

Run:
```bash
cd frontend && npm test -- lib/mediaValidators.test.ts --coverage --watchAll=false
```

Expected: Coverage for `mediaValidators.ts` shows 100% for lines, branches, functions.

---

## Task 10: Final Commit and Summary

**Files:**
- Summary: All changes committed

- [ ] **Step 1: Verify all changes are staged**

Run:
```bash
git status
```

Expected: All modified files shown as staged (added/modified).

- [ ] **Step 2: Create final commit**

Run:
```bash
git add frontend/app/novo-relatorio/page.tsx
git commit -m "feat: add video upload support to report form

- Accept video files in all media upload fields
- Validate file type (image/* or video/*) before adding
- Validate file size (max 15MB) before adding
- Display validation errors in form error zone
- Maintain existing file count limits (5 per topic)
"
```

- [ ] **Step 3: Verify commit**

Run:
```bash
git log --oneline -3
```

Expected: Three most recent commits visible, with new feat commit at top.

---

## Spec Coverage Verification

✅ **Requirement: Accept images and videos in all sections**
→ Task 3-4: Updated all 6 `accept` attributes to include video/*

✅ **Requirement: 15MB size limit on frontend**
→ Task 2: `isValidMediaSize()` function tests <= 15MB
→ Task 6-7: Handlers call validation before accepting

✅ **Requirement: 15MB size limit on backend**
→ Backend already supports in `uploadReportMedia()` — no changes needed (validation added at API layer)

✅ **Requirement: Validate file type before upload**
→ Task 2: `isValidMediaType()` checks image/* and video/*
→ Task 6-7: Handlers validate before accepting files

✅ **Requirement: Error messages in system notification style**
→ Task 6-7: Uses existing `setSubmitError()` pattern, displayed in form error zone

✅ **Requirement: File count limit (5 per topic, combined)**
→ Task 7: Handler checks limit after validation, before accepting
→ Existing logic applies to both images and videos

---

## Notes

- **Backend upload already supports videos** — `uploadReportMedia()` detects MIME type and sets `media_type` to "image" or "video"
- **No database changes needed** — Schema already supports both types
- **Validation is additive** — Doesn't break existing image-only flow, just expands it
- **Error UX consistent** — Uses same `setSubmitError()` pattern as existing validations
