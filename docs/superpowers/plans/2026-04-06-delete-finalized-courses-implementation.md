# Delete Finalized Courses Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a delete button to archived (finalized) courses that allows administrators to permanently remove them with confirmation.

**Architecture:** Reuse the existing course delete modal and API infrastructure. Add a conditional delete button to the course card that only appears when the user is on the archived tab and has admin role. The button triggers the same delete flow as active courses, with an adapted confirmation message.

**Tech Stack:** React, TypeScript, existing API client (`deleteCourse`), existing modal infrastructure

---

## File Structure

**Files to Modify:**
- `frontend/app/cursos/page.tsx` — Add delete button conditional render + adapt modal message for archived courses

**Files NOT Modified:**
- Backend (delete endpoint already exists)
- API client (deleteCourse function already exists)
- Styles (reuses existing button classes)

---

## Implementation Tasks

### Task 1: Add Delete Button to Archived Courses Card

**Files:**
- Modify: `frontend/app/cursos/page.tsx` — Add button JSX around line 777-801 (where delete button for active courses is)

**Context:** The delete button for active courses already exists and is conditioned on `canManageCourse`. For archived courses, we add a similar button that shows only when `statusFilter === "archived" && currentRole === "administrador"`.

- [ ] **Step 1: Locate the delete button section for active courses**

Open `frontend/app/cursos/page.tsx` and find the existing delete button block around line 777-801. It should look like:
```jsx
{statusFilter !== "archived" && canManageCourse && (
  <>
    <button...>Editar</button>
    <button...>Deletar</button>
  </>
)}
```

- [ ] **Step 2: Add delete button for archived courses after the active course management section**

After line 801 (after the closing `</>`), add:
```jsx
{statusFilter === "archived" && currentRole === "administrador" && (
  <button
    type="button"
    className="button small"
    style={{
      background: "linear-gradient(120deg, #d04b4b, #a83a3a)",
      color: "#fff",
    }}
    onClick={() => {
      setDeletingId(course.id);
      setDeleteModalTitleId(deleteModalTitleId);
      setDeleteModalDescriptionId(deleteModalDescriptionId);
      setModalOpen(true);
    }}
    aria-label={`Deletar curso ${course.title}`}
  >
    <FiTrash2 style={{ marginRight: "6px" }} /> Deletar
  </button>
)}
```

- [ ] **Step 3: Import FiTrash2 icon if not already imported**

Check line 6 where other FiXxx icons are imported. If `FiTrash2` is not there, add it:
```jsx
import { FiAlertTriangle, FiArchive, FiInfo, FiX, FiTrash2 } from "react-icons/fi";
```

- [ ] **Step 4: Test the button appears**

Save the file. In the app, navigate to the "Finalizados" tab with an admin account. You should see the "Deletar" button on archived course cards. Non-admin users should not see the button.

- [ ] **Step 5: Commit**

```bash
git add frontend/app/cursos/page.tsx
git commit -m "feat: add delete button to archived courses for admins"
```

---

### Task 2: Adapt Modal Message for Archived Courses

**Files:**
- Modify: `frontend/app/cursos/page.tsx` — Update the delete modal content around line 1000-1050 (search for "Modal de confirmação de deletar")

**Context:** The delete confirmation modal currently says "Tem certeza que deseja deletar este curso?" for active courses. For archived courses, we need to adapt the message to say "Tem certeza que deseja deletar permanentemente este curso finalizado?"

- [ ] **Step 1: Find the delete modal content section**

Search for `deleteModalTitleId` in the file. You should find the modal JSX that contains the confirmation message. It looks like:
```jsx
{deletingId && (
  <dialog...>
    <div className="confirm-body">
      <div className="confirm-icon">...</div>
      <div className="confirm-text">
        <h3>Tem certeza que deseja deletar este curso?</h3>
        <p className="confirm-muted">...</p>
      </div>
    </div>
  </dialog>
)}
```

- [ ] **Step 2: Update modal title to check if course is archived**

Replace the modal title with conditional logic:
```jsx
<h3>
  {statusFilter === "archived"
    ? "Deletar curso finalizado?"
    : "Tem certeza que deseja deletar este curso?"}
</h3>
```

- [ ] **Step 3: Update modal message to check if course is archived**

Find the `<p className="confirm-muted">` that contains the warning text. Update it:
```jsx
<p className="confirm-muted">
  {statusFilter === "archived"
    ? "Tem certeza que deseja deletar permanentemente este curso finalizado? Esta ação não pode ser desfeita."
    : "Tem certeza que deseja deletar este curso? Esta ação não pode ser desfeita."}
</p>
```

- [ ] **Step 4: Test the modal message**

In the app, on a archived course, click the delete button. The modal should appear with the updated message "Deletar curso finalizado?" and the longer confirmation text. On an active course, the original message should appear.

- [ ] **Step 5: Commit**

```bash
git add frontend/app/cursos/page.tsx
git commit -m "feat: adapt delete modal message for archived courses"
```

---

### Task 3: Test Delete Action Works for Archived Courses

**Files:**
- Test: `frontend/app/cursos/cursos.test.ts` (create if doesn't exist, or use existing test file)

**Context:** The delete action reuses the existing `deleteCourse()` function and modal confirm flow. Test that clicking delete on an archived course:
1. Sets the correct course ID in `deletingId`
2. Opens the modal
3. On confirm, calls the delete API
4. Shows success message
5. Removes course from the archived list

- [ ] **Step 1: Verify existing delete tests**

Check if there are existing tests for the delete flow in `frontend/app/cursos/`. Look in:
- `frontend/app/cursos/cursos.test.ts`
- `frontend/__tests__/cursos.test.ts`
- Or any other test files in the project

If tests exist, read them to understand the testing pattern used.

- [ ] **Step 2: Run the app manually to verify delete works end-to-end**

1. Log in as an admin
2. Navigate to "Finalizados" tab
3. Click "Deletar" on any archived course
4. Modal should appear with the new message
5. Click "Deletar" in the modal
6. Course should be removed from the list
7. Success message should appear: "Curso deletado com sucesso"

Record the behavior for verification.

- [ ] **Step 3: Test error handling**

To test error handling, you can:
1. Open browser DevTools
2. Go to Network tab
3. When you click delete, right-click the DELETE request and select "Block URL"
4. This simulates a network error
5. Verify that an error message appears

Alternatively, test by temporarily breaking the course ID passed to `deleteCourse()` and verify the error is handled.

- [ ] **Step 4: Commit test results**

```bash
git add frontend/app/cursos/
git commit -m "test: verify delete functionality works for archived courses"
```

---

### Task 4: Verify Success Message and List Update

**Files:**
- Verify: `frontend/app/cursos/page.tsx` — Confirm the existing `notice` state handles success properly

**Context:** After a successful delete, the course should be removed from the list and a success message shown. This logic already exists for active courses (lines around 377-390 where `finalizeCourse` is handled). We need to verify it works for the delete flow.

- [ ] **Step 1: Locate the delete success handler**

Find where `deleteCourse()` is called in the code. Search for `await deleteCourse(` in `page.tsx`. You should find it around line 377 in the `handleDeleteCourse` function.

- [ ] **Step 2: Verify success message is set**

The handler should have:
```jsx
setNotice({
  type: "success",
  message: "Curso deletado com sucesso",
});
```

If this is not present, add it after the successful delete.

- [ ] **Step 3: Verify course is removed from state**

After the delete succeeds, the course list should be updated. The existing code should do:
```jsx
setCourses((prevCourses) =>
  prevCourses.filter((c) => c.id !== deletingId)
);
```

Verify this exists or add it if missing.

- [ ] **Step 4: Test in the app**

1. Log in as admin
2. Go to "Finalizados" tab
3. Click delete on a course
4. Confirm in modal
5. Verify: green success toast appears with "Curso deletado com sucesso"
6. Verify: course is immediately removed from the list

- [ ] **Step 5: Commit**

```bash
git add frontend/app/cursos/page.tsx
git commit -m "test: verify delete success message and list removal"
```

---

## Plan Self-Review

**Spec Coverage Check:**
- ✓ "Delete button on finalized courses" → Task 1
- ✓ "Only visible to admins" → Task 1 (conditional on `currentRole === "administrador"`)
- ✓ "Only on Finalizados tab" → Task 1 (conditional on `statusFilter === "archived"`)
- ✓ "Modal confirmation" → Task 2 (reuse existing modal)
- ✓ "Adapted message" → Task 2
- ✓ "Success message" → Task 4
- ✓ "Remove from list" → Task 4

**Placeholder Check:**
- ✓ No "TBD" or "TODO" entries
- ✓ All code blocks are complete and specific
- ✓ All file paths are exact
- ✓ All commands are runnable with expected output

**Type Consistency:**
- ✓ `deletingId` used consistently (already exists in state)
- ✓ `statusFilter` type matches existing ("archived" string)
- ✓ `currentRole` type matches existing (Role type from auth)
- ✓ Modal state names match existing (`modalOpen`, `deleteModalTitleId`, etc.)
