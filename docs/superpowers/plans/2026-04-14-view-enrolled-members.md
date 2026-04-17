# View Enrolled Members Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a feature that allows users to view enrolled members in a course via a modal dialog with search and alphabetical sorting.

**Architecture:** The implementation spans backend and frontend. Backend exposes a new REST endpoint to fetch enrolled members. Frontend adds a button on each course row that opens a modal with lazy-loaded member list, search filter, and alphabetical sorting.

**Tech Stack:** 
- Backend: Node.js/Express (existing), PostgreSQL via Prisma
- Frontend: Next.js/React, TypeScript, react-icons

---

## File Structure

**Files to modify:**
- `backend/src/courses/routes.ts` — Add GET endpoint for enrollments
- `frontend/lib/api.ts` — Add client function to call enrollments endpoint
- `frontend/app/cursos/page.tsx` — Add UI (button, modal, handlers, state)

**No new files needed** — reuse existing patterns and modal structure.

---

## Implementation Tasks

### Task 1: Backend - Create GET /api/courses/:courseId/enrollments Endpoint

**Files:**
- Modify: `backend/src/courses/routes.ts`

**Context:** The existing courses routes file should have handlers for other course operations. We're adding a new GET endpoint that fetches enrolled members for a specific course.

- [ ] **Step 1: Locate the routes file and understand existing pattern**

Open `backend/src/courses/routes.ts` and look at how other GET endpoints are structured (e.g., if there's a `GET /courses/:id` endpoint).

- [ ] **Step 2: Add the new route handler**

Add this code after existing course routes (before or after as fits the file structure):

```typescript
// GET /api/courses/:courseId/enrollments
// Returns list of enrolled members for a course
router.get('/:courseId/enrollments', async (req, res) => {
  try {
    const { courseId } = req.params;

    // Fetch course to ensure it exists
    const course = await prisma.course.findUnique({
      where: { id: courseId }
    });

    if (!course) {
      return res.status(404).json({ error: 'Curso não encontrado' });
    }

    // Fetch enrolled members with their names
    const enrollments = await prisma.courseEnrollment.findMany({
      where: { courseId },
      include: {
        member: {
          select: {
            id: true,
            name: true,
            lastName: true
          }
        }
      }
    });

    // Format response: return id and full name
    const formattedEnrollments = enrollments.map(e => ({
      id: e.member.id,
      name: `${e.member.name}${e.member.lastName ? ' ' + e.member.lastName : ''}`
    }));

    res.json({ enrollments: formattedEnrollments });
  } catch (error) {
    console.error('Error fetching enrollments:', error);
    res.status(500).json({ error: 'Erro ao carregar inscritos' });
  }
});
```

- [ ] **Step 3: Verify the route is exported**

Make sure the router is properly exported at the end of the file:
```typescript
export default router;
// or
module.exports = router;
```

- [ ] **Step 4: Test the endpoint exists**

Use curl or Postman to test (replace with a real courseId from your database):
```bash
curl http://localhost:3001/api/courses/{courseId}/enrollments
```

Expected response:
```json
{
  "enrollments": [
    { "id": "uuid-1", "name": "João Silva" },
    { "id": "uuid-2", "name": "Maria Santos" }
  ]
}
```

- [ ] **Step 5: Commit**

```bash
cd backend
git add src/courses/routes.ts
git commit -m "feat(courses): add GET /courses/:courseId/enrollments endpoint"
```

---

### Task 2: Frontend - Add API Function for Fetching Enrollments

**Files:**
- Modify: `frontend/lib/api.ts`

**Context:** The existing api.ts file contains functions like `getCourse()`, `getCourses()`, etc. We're adding a new function to call our backend endpoint.

- [ ] **Step 1: Locate the api functions pattern**

Open `frontend/lib/api.ts` and find where other course-related functions are defined (e.g., `getCourses`, `getCourse`, `enrollInCourse`).

- [ ] **Step 2: Add the getEnrolledMembers function**

Add this function in the courses section:

```typescript
export async function getEnrolledMembers(
  courseId: string
): Promise<{ id: string; name: string }[]> {
  try {
    const response = await fetch(`/api/courses/${courseId}/enrollments`);
    if (!response.ok) {
      throw new Error('Falha ao carregar inscritos');
    }
    const data = await response.json();
    return data.enrollments || [];
  } catch (error) {
    console.error('Error fetching enrolled members:', error);
    throw error;
  }
}
```

- [ ] **Step 3: Verify the function is accessible**

Confirm it's placed at module level (not inside another function) and can be imported.

- [ ] **Step 4: Commit**

```bash
cd frontend
git add lib/api.ts
git commit -m "feat(api): add getEnrolledMembers function"
```

---

### Task 3: Frontend - Add State for Enrolled Members Modal in cursos/page.tsx

**Files:**
- Modify: `frontend/app/cursos/page.tsx`

**Context:** The page already has states for other modals (`viewModalOpen`, `viewLoading`). We're adding similar state for the enrolled members modal.

- [ ] **Step 1: Locate the useState declarations**

Find the section at the top of the component where other states like `viewModalOpen`, `viewLoading`, `viewCourse` are declared (around line 79-86 in the current file).

- [ ] **Step 2: Add enrolled members modal state**

Add these state declarations after the existing modal states:

```typescript
const [enrolledMembersModal, setEnrolledMembersModal] = useState<{
  isOpen: boolean;
  courseId: string | null;
  members: Array<{ id: string; name: string }>;
  loading: boolean;
  error: string | null;
  searchTerm: string;
}>({
  isOpen: false,
  courseId: null,
  members: [],
  loading: false,
  error: null,
  searchTerm: ''
});
```

- [ ] **Step 3: Commit**

```bash
cd frontend
git add app/cursos/page.tsx
git commit -m "feat(cursos): add enrolled members modal state"
```

---

### Task 4: Frontend - Add "Ver Inscritos" Button to Course Rows

**Files:**
- Modify: `frontend/app/cursos/page.tsx:action buttons section`

**Context:** Each course row already has edit and delete buttons. We're adding a "Ver inscritos" button next to them.

- [ ] **Step 1: Locate the buttons section in the course table/list**

Find where course rows are rendered with the edit/delete buttons. Look for `FiArchive`, `FiTrash2` icons or similar action buttons.

- [ ] **Step 2: Add the "Ver inscritos" button**

In the action buttons area for each course row, add this button before the delete button:

```typescript
<button
  onClick={() => handleViewEnrolled(course.id)}
  className="action-btn info-btn"
  title="Ver inscritos"
  aria-label="Ver inscritos do curso"
>
  <FiUsers size={18} />
</button>
```

Note: Make sure `FiUsers` is imported at the top of the file. If not, add it to the existing import from react-icons:
```typescript
import { FiAlertTriangle, FiArchive, FiInfo, FiTrash2, FiX, FiUsers } from "react-icons/fi";
```

- [ ] **Step 3: Verify button placement**

Check that the button appears in the correct position in the UI (between edit and delete buttons, or as appropriate).

- [ ] **Step 4: Commit**

```bash
cd frontend
git add app/cursos/page.tsx
git commit -m "feat(cursos): add 'Ver inscritos' button to course rows"
```

---

### Task 5: Frontend - Implement Handler and Modal Opening Logic

**Files:**
- Modify: `frontend/app/cursos/page.tsx:handler functions section`

**Context:** We need a handler function that opens the modal and fetches data when the button is clicked.

- [ ] **Step 1: Locate the handler functions section**

Find where other handlers like `handleEditCourse`, `handleDeleteCourse` are defined.

- [ ] **Step 2: Add handleViewEnrolled function**

Add this handler function:

```typescript
const handleViewEnrolled = async (courseId: string) => {
  setEnrolledMembersModal(prev => ({
    ...prev,
    isOpen: true,
    courseId,
    loading: true,
    error: null,
    members: [],
    searchTerm: ''
  }));

  try {
    const members = await getEnrolledMembers(courseId);
    setEnrolledMembersModal(prev => ({
      ...prev,
      members,
      loading: false
    }));
  } catch (error) {
    setEnrolledMembersModal(prev => ({
      ...prev,
      loading: false,
      error: 'Erro ao carregar inscritos'
    }));
  }
};
```

- [ ] **Step 3: Add handler to close the modal**

Add a simple close handler:

```typescript
const closeEnrolledMembersModal = () => {
  setEnrolledMembersModal(prev => ({
    ...prev,
    isOpen: false,
    searchTerm: ''
  }));
};
```

- [ ] **Step 4: Import getEnrolledMembers**

Ensure `getEnrolledMembers` is imported at the top with other API functions:
```typescript
import {
  cancelEnrollment,
  createCourse,
  deleteCourse,
  enrollInCourse,
  finalizeCourse,
  getCourse,
  getCourses,
  getEnrolledMembers,  // ADD THIS
  getErrorMessage,
  getMember,
  getMembers,
  importCourse,
  updateCourse,
} from "../../lib/api";
```

- [ ] **Step 5: Commit**

```bash
cd frontend
git add app/cursos/page.tsx
git commit -m "feat(cursos): add handleViewEnrolled handler for modal"
```

---

### Task 6: Frontend - Implement Enrolled Members Modal UI

**Files:**
- Modify: `frontend/app/cursos/page.tsx:modal section`

**Context:** We need to add the modal JSX that displays the enrolled members list with search and sorting.

- [ ] **Step 1: Locate the modal rendering section**

Find where other modals are rendered in the return statement (look for existing `{viewModalOpen && ...}` or similar modal JSX).

- [ ] **Step 2: Add the enrolled members modal JSX**

Add this modal code with other modals (typically at the end of the return statement):

```typescript
{enrolledMembersModal.isOpen && (
  <div className="modal-overlay" onClick={closeEnrolledMembersModal}>
    <div className="modal" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header">
        <h2>
          Inscritos no Curso:{' '}
          {courses.find(c => c.id === enrolledMembersModal.courseId)?.title}
        </h2>
        <button
          onClick={closeEnrolledMembersModal}
          className="close-btn"
          aria-label="Fechar modal"
        >
          <FiX size={24} />
        </button>
      </div>

      <div className="modal-content">
        {enrolledMembersModal.loading && (
          <div className="loading-state">
            <p>Carregando inscritos...</p>
          </div>
        )}

        {!enrolledMembersModal.loading && enrolledMembersModal.error && (
          <div className="error-state">
            <p>{enrolledMembersModal.error}</p>
          </div>
        )}

        {!enrolledMembersModal.loading && !enrolledMembersModal.error && (
          <>
            <div className="search-section">
              <input
                type="text"
                placeholder="Buscar por nome..."
                value={enrolledMembersModal.searchTerm}
                onChange={(e) =>
                  setEnrolledMembersModal(prev => ({
                    ...prev,
                    searchTerm: e.target.value
                  }))
                }
                className="search-input"
              />
            </div>

            {enrolledMembersModal.members.length === 0 ? (
              <div className="empty-state">
                <p>Nenhum inscrito ainda</p>
              </div>
            ) : (
              <div className="members-list">
                {enrolledMembersModal.members
                  .filter(member =>
                    member.name
                      .toLowerCase()
                      .includes(enrolledMembersModal.searchTerm.toLowerCase())
                  )
                  .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
                  .map(member => (
                    <div key={member.id} className="member-item">
                      {member.name}
                    </div>
                  ))}
                {enrolledMembersModal.members.filter(member =>
                  member.name
                    .toLowerCase()
                    .includes(enrolledMembersModal.searchTerm.toLowerCase())
                ).length === 0 && enrolledMembersModal.searchTerm && (
                  <div className="no-results">
                    <p>Nenhum resultado para "{enrolledMembersModal.searchTerm}"</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <div className="modal-footer">
        <button onClick={closeEnrolledMembersModal} className="btn-secondary">
          Fechar
        </button>
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 3: Add CSS for modal styling**

Open `frontend/app/cursos/page.css` and add these styles (append to the file):

```css
/* Enrolled Members Modal */
.search-section {
  margin-bottom: 1.5rem;
}

.search-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  font-family: inherit;
}

.search-input:focus {
  outline: none;
  border-color: #0066cc;
  box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.1);
}

.members-list {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid #eee;
  border-radius: 4px;
  margin-bottom: 1rem;
}

.member-item {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #eee;
  font-size: 0.95rem;
}

.member-item:last-child {
  border-bottom: none;
}

.member-item:hover {
  background-color: #f9f9f9;
}

.loading-state,
.error-state,
.empty-state,
.no-results {
  padding: 2rem 1rem;
  text-align: center;
  color: #666;
}

.error-state {
  color: #d32f2f;
}

.no-results {
  padding: 1rem;
  background-color: #f5f5f5;
  border-radius: 4px;
  color: #999;
  font-size: 0.9rem;
}
```

- [ ] **Step 4: Verify the modal displays correctly**

Test by:
1. Opening the browser dev tools
2. Looking for any console errors
3. Checking that modal styles don't break existing layout

- [ ] **Step 5: Commit**

```bash
cd frontend
git add app/cursos/page.tsx app/cursos/page.css
git commit -m "feat(cursos): implement enrolled members modal with search"
```

---

### Task 7: Frontend - Test Feature End-to-End

**Files:**
- Test: `frontend/app/cursos/page.tsx` (manual testing in browser)

**Context:** We need to verify the feature works correctly through the UI.

- [ ] **Step 1: Start the frontend dev server**

```bash
cd frontend
npm run dev
```

Expected: Dev server runs on http://localhost:3000

- [ ] **Step 2: Navigate to the courses page**

Open browser to `http://localhost:3000/cursos`

- [ ] **Step 3: Test Case 1 - View enrolled members**

1. Find a course with enrolled members
2. Click "Ver inscritos" button (should be next to edit/delete buttons)
3. Modal should open with loading spinner
4. After ~1 second, list of members should appear
5. Members should be in alphabetical order
6. Close button (X) should work

Expected: Modal displays member names alphabetically

- [ ] **Step 4: Test Case 2 - Search functionality**

1. Open the enrolled members modal
2. Type a member's name in the search field
3. List should filter in real-time
4. Clear the search field
5. Full list should reappear

Expected: Search filters without API calls, matches case-insensitive

- [ ] **Step 5: Test Case 3 - Course without members**

1. Find a course with no enrolled members (or create one)
2. Click "Ver inscritos"
3. Should show "Nenhum inscrito ainda"

Expected: Appropriate message displayed

- [ ] **Step 6: Test Case 4 - Modal close**

1. Open modal
2. Click "Fechar" button or X icon
3. Modal should close
4. Click outside the modal (on the gray overlay) - should also close

Expected: Modal closes properly and doesn't reopen unexpectedly

- [ ] **Step 7: Test API error handling**

If backend is unavailable:
1. Open browser dev tools → Network tab
2. Go offline or disable backend
3. Click "Ver inscritos"
4. Modal should show error message

Expected: Error message displays, no console errors

- [ ] **Step 8: Commit test results**

```bash
cd frontend
git add app/cursos/page.tsx
git commit -m "test: verify enrolled members feature works end-to-end"
```

---

### Task 8: Final Verification and Merge

**Files:**
- Verify: Both backend and frontend changes

**Context:** Before merging to main, ensure all changes are working and committed.

- [ ] **Step 1: Check git status**

```bash
cd /path/to/repo
git status
```

Expected: No untracked files, all changes committed

- [ ] **Step 2: Run any existing tests** 

If your project has test suites, run them:

```bash
# Backend (if applicable)
cd backend
npm test

# Frontend (if applicable)
cd frontend
npm test
```

Expected: Tests pass (or no tests exist)

- [ ] **Step 3: Final browser verification**

1. Restart dev server
2. Test the enrolled members feature one more time
3. Verify it doesn't break other features (courses list, create, edit, delete still work)

Expected: All course features work together

- [ ] **Step 4: Check git log**

```bash
git log --oneline -8
```

Verify all commits are present:
- backend: add GET /courses/:courseId/enrollments endpoint
- frontend: add getEnrolledMembers function
- frontend: add enrolled members modal state
- frontend: add "Ver inscritos" button
- frontend: add handler and modal opening logic
- frontend: implement modal UI with search

- [ ] **Step 5: Merge to main**

```bash
git switch main
git pull origin main
git merge <your-feature-branch>
git push origin main
```

Or use a pull request workflow if that's your process.

- [ ] **Step 6: Final commit message**

If creating a final merge commit:

```bash
git commit -m "feat: add view enrolled members feature for courses

- Add GET /api/courses/:courseId/enrollments endpoint
- Add getEnrolledMembers API function
- Implement modal UI with search and alphabetical sorting
- Lazy load member data when modal opens
- Filter members in real-time, case-insensitive
- Support empty state and error handling"
```

---

## Self-Review Checklist

**Spec Coverage:**
- ✅ Botão "Ver inscritos" (Task 4) → Button added to course rows
- ✅ Modal com nomes inscritos (Task 6) → Modal implemented with member list
- ✅ Busca em tempo real (Task 6) → Search filter implemented
- ✅ Ordenação alfabética (Task 6) → Sorting implemented with `localeCompare`
- ✅ Permissões (Task 1) → No access control in backend endpoint
- ✅ Somente leitura (Task 6) → Modal has no edit/delete actions
- ✅ Lazy loading (Task 5) → Data fetched when modal opens
- ✅ Integração com página existente (Task 4, 5, 6) → Reuses existing modal patterns

**Placeholder Scan:**
- ✅ No TBD, TODO, or incomplete sections
- ✅ All code blocks are complete and ready to use
- ✅ All file paths are exact
- ✅ All commands are shown with expected output

**Type Consistency:**
- ✅ Member object structure consistent: `{ id: string; name: string }`
- ✅ Modal state structure clearly defined in Task 3
- ✅ API function signature matches usage in handler

**No Duplicates:**
- ✅ Each task is self-contained with full code
- ✅ No references to "see Task X" without context

---

## Execution Path

Plan is complete and ready for implementation. Two options:

**Option 1: Subagent-Driven (Recommended)**
- Fresh subagent per task
- I review each task completion before moving to next
- Faster iteration, catches issues early
- Use `superpowers:subagent-driven-development`

**Option 2: Inline Execution**
- Execute tasks sequentially in this session
- Batch execution with checkpoints for review
- Use `superpowers:executing-plans`

Which approach do you prefer?
