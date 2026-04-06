# Video Upload Support in Report Creation

**Date:** 2026-04-06  
**Feature:** Add video file upload support to the new report page alongside existing photo uploads  
**Status:** Design Approved

## Overview

Enable users to upload both images and videos to all media sections in the report creation flow. Videos will be limited to 15MB per file, with the existing 5-file limit per topic applied to combined image + video uploads.

## Requirements

- **Accepted media types:** All image formats and all video formats
- **Size limit:** 15MB per file (enforced on frontend and backend)
- **File count limit:** Maximum 5 files per topic (existing constraint, applied to images + videos combined)
- **Sections affected:** All media upload fields:
  - Fotos de Danos
  - Fotos do Evento (Pintura, Balão, Animação, Personagens, Oficinas)

## Design

### 1. Frontend Changes

#### Update File Input Accept Attribute
Change all `MediaUploadField` components:
- Current: `accept="image/*"`
- New: `accept="image/*,video/*"`

Locations to update:
- Line 933: Damage photos
- Lines 954, 969, 984, 1004, 1019: Event photo topics (Painting, Balloon, Animation, Characters, Workshops)

#### Create Media Validation Helper (`lib/mediaValidators.ts`)

Three utility functions:

```typescript
/**
 * Check if file has valid MIME type (image/* or video/*)
 */
function isValidMediaType(file: File): boolean

/**
 * Check if file size <= 15MB (15 * 1024 * 1024 bytes)
 */
function isValidMediaSize(file: File): boolean

/**
 * Return user-friendly error message for invalid file, or null if valid
 * Examples:
 *   - "Arquivo inválido. Envie uma imagem ou vídeo."
 *   - "Arquivo muito grande (máx 15MB)."
 */
function getMediaValidationError(file: File): string | null
```

#### Update File Add Handlers

Modify all file-add handlers (`handleEventPhotosTopicAdd`, `handleDamageImagesAdd`) to validate before accepting:

1. Call `getMediaValidationError(file)` for each file
2. If error exists, call `setSubmitError(error)` and return (do not add file)
3. If valid, proceed with existing logic (`addFilesWithoutDuplicates`)
4. After user fixes the issue, `submitError` clears when they interact with the form

Error messages display in the existing error zone at bottom of form (line 1029).

### 2. Backend Changes

#### Validation in Upload Endpoint (`uploadReportMedia`)

For each uploaded file:

1. **Size validation:** Reject if file size > 15MB
2. **MIME type validation:** Reject if not `image/*` or `video/*`
3. **Error response:** Return 400 with clear message:
   - `{ error: "Arquivo muito grande (máx 15MB)." }`
   - `{ error: "Tipo de arquivo inválido. Envie uma imagem ou vídeo." }`

Frontend catches error and displays via `setSubmitError()`.

### 3. Error Flow

```
User selects file
  ↓
Frontend validation
  ├─ Invalid? → setSubmitError() → Display error in form
  └─ Valid? → Continue
     ↓
     Upload to backend
       ↓
       Backend validation
         ├─ Invalid? → HTTP 400 + error message → setSubmitError()
         └─ Valid? → Store file
```

## Data Model

No database schema changes required. The existing `report_media` table already supports both images and videos (validated on type at upload time).

## Testing Scope

Frontend:
- Valid image upload works
- Valid video upload (< 15MB) works
- Oversized video rejected with error message
- Invalid file type rejected with error message
- File count limit enforced per topic (5 max, images + videos combined)

Backend:
- Oversized file rejected with 400 status
- Invalid MIME type rejected with 400 status
- Valid image and video stored successfully

## Impact Analysis

**What changes:**
- Two input attributes (`accept` prop)
- New validation helper file
- Modified file-add handlers to validate before accepting

**What stays the same:**
- Component structure (`MediaUploadField`)
- API routes and endpoints
- Database schema
- Upload storage mechanism
- Existing error display pattern

**Risk level:** Low. Additive change with minimal touch surface, uses existing error patterns.
