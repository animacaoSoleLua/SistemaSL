# Delete Finalized Courses Feature Design

**Date**: 2026-04-06  
**Feature**: Add delete functionality for archived (finalized) courses  
**Scope**: Frontend UI + existing backend delete endpoint

---

## Overview

Add a "Delete" button to finalized courses (archived courses) that allows administrators to permanently remove them from the system. The feature reuses the existing course deletion logic and modal confirmation flow.

---

## Requirements

- **Who can delete**: Only administrators can see and use the delete button
- **Where**: Delete button appears only in the "Finalizados" (archived) tab
- **Confirmation**: Modal confirmation required before deletion
- **Feedback**: Success message shown after deletion, course removed from list
- **Error handling**: Server errors displayed to user

---

## Design Sections

### 1. Permissions and Visibility

**Rule**: The "Delete" button is visible only when both conditions are met:
1. User is on the "Finalizados" tab (`statusFilter === "archived"`)
2. User role is "administrador" (`currentRole === "administrador"`)

**Permission Check Location**: Frontend conditional render before displaying the button

**Backend**: The existing `DELETE /cursos/:courseId` endpoint already exists and handles authorization at the API level

---

### 2. UI Positioning and Styling

**Location**: The button is placed in the `.course-actions` section of the course card (alongside other action buttons)

**Button Specifications**:
- **Icon**: `FiTrash2` (from react-icons/fi)
- **Text**: "Deletar"
- **CSS Class**: `button small`
- **Style Variant**: Destructive (red color scheme to indicate danger)
- **Conditional Display**: Only rendered when `statusFilter === "archived" && currentRole === "administrador"`

**Example JSX Pattern**:
```jsx
{statusFilter === "archived" && currentRole === "administrador" && (
  <button
    type="button"
    className="button small"
    style={{...destructive styles...}}
    onClick={() => handleDeleteCourse(course.id)}
    aria-label="Deletar curso"
  >
    <FiTrash2 /> Deletar
  </button>
)}
```

---

### 3. Modal Confirmation

**Reuse**: The existing delete confirmation modal is reused (IDs: `deleteModalTitleId`, `deleteModalDescriptionId`)

**Modal Content Adaptation**:
- **Title**: "Deletar curso finalizado?"
- **Icon**: Red alert circle (existing `confirm-icon` with warning style)
- **Message**: "Tem certeza que deseja deletar permanentemente este curso finalizado? Esta ação não pode ser desfeita."
- **Buttons**: 
  - "Cancelar" (secondary)
  - "Deletar" (destructive/red)

**Behavior**:
- Modal opens when user clicks the delete button on a finalized course
- If user cancels → modal closes, no action taken
- If user confirms → `deleteCourse(courseId)` API call is made

---

### 4. Flow and User Feedback

**Sequence**:

1. User navigates to "Finalizados" tab
2. User sees delete button on archived course card (if user is admin)
3. User clicks "Deletar"
4. Modal confirmation opens with adapted message
5. User confirms deletion
6. Loading state: Button shows loading spinner, modal may gray out or disable
7. **On Success**:
   - Modal closes
   - Success toast: "Curso deletado com sucesso"
   - Course is removed from the archived courses list
8. **On Error**:
   - Modal remains open or closes
   - Error toast shows: `getErrorMessage(error)`

---

### 5. State Management

**Existing State Reuse**:
- `deletingId`: Already tracks which course is being deleted
- `notice`: Already handles toast messages (type: "success" | "error")
- Modal open/close handled by existing modal state

**No New State Required**: The feature reuses all existing state variables and modal infrastructure.

---

### 6. API Integration

**Endpoint**: `DELETE /cursos/:courseId` (already implemented)

**Request**:
```
DELETE /api/cursos/{courseId}
Authorization: Bearer {token}
```

**Response**:
```json
{
  "data": {
    "id": "course-id"
  }
}
```

**Error Response**: Standard error format (uses `getErrorMessage()`)

---

### 7. Testing Considerations

- Test that delete button only appears for admins on archived courses
- Test that delete button does NOT appear for non-admins
- Test that delete button does NOT appear on active courses (any tab)
- Test modal opens with correct message on delete click
- Test successful deletion removes course from list and shows success toast
- Test error handling displays error message
- Test cancel button closes modal without deleting

---

## Implementation Scope

**Files to Modify**:
- `frontend/app/cursos/page.tsx` — Add delete button and conditionals

**Files NOT Modified**:
- Backend routes (deletion endpoint already exists)
- API client (deleteCourse function already exists)
- CSS (uses existing button classes and styles)

**Estimated Changes**: ~15-20 lines of code (conditional button + optional handler refinement)

---

## Success Criteria

- ✓ Delete button appears only for admins on archived courses
- ✓ Modal confirmation with appropriate message is shown
- ✓ Deletion succeeds and course is removed from list
- ✓ Success message displayed
- ✓ Errors handled gracefully with user message
