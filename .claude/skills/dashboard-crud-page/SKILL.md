---
name: dashboard-crud-page
description: >
  Standardizes Dashboard CRUD pages with consistent structure, hooks, and UI patterns.
  Trigger: When creating any CRUD page in the Dashboard sub-project (src/pages/).
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## When to Use

- Creating a new page under `Dashboard/src/pages/`
- Adding list + create/edit/delete functionality to the Dashboard
- Any page that manages a resource with a table, modal form, and delete confirmation

## Critical Patterns

### 1. Required Hook Trio (NEVER use raw useState for these)

| Need | Hook | Import |
|------|------|--------|
| Modal state + form data | `useFormModal<FormData, Entity>` | `../hooks/useFormModal` |
| Delete confirmation state | `useConfirmDialog<Entity>` | `../hooks/useConfirmDialog` |
| Pagination | `usePagination(sortedItems)` | `../hooks/usePagination` |

### 2. HelpButton — MANDATORY on every page

Every page MUST pass `helpContent` to `PageContainer`. Content lives in `Dashboard/src/utils/helpContent.tsx`, never inline on the page itself.

Every create/edit modal MUST have a small `HelpButton` (`size="sm"`) as the first element inside the form.

### 3. React 19 Form Submission — useActionState (NEVER useState + handler)

Use `useActionState` for all form submissions. The action reads from `FormData`, validates, calls the store async action, returns `FormState<T>`. Close the modal by checking `state.isSuccess` at render time (not inside the action).

### 4. Zustand — Selectors always, useShallow for filtered arrays

Never destructure from a store call. For filtered/computed arrays use `useShallow`. For derived data from already-extracted state use `useMemo`.

### 5. Branch-scoped entities

If the entity belongs to a branch, guard the page render and filter data:
- Show a "select branch first" card when `!selectedBranchId`
- Filter in `useMemo` using `selectedBranchId`
- Pass `selectedBranchId` to `openCreate` as part of the initial form data

### 6. Loading skeleton

Show `<TableSkeleton>` while the store's `isLoading` flag is true, not an empty table.

### 7. Cascade delete

Use wrapper functions from `../services/cascadeService` (e.g., `deleteCategoryWithCascade`). Show `<CascadePreviewList>` inside `<ConfirmDialog>` when there are affected items.

### 8. Columns definition

Define `columns: TableColumn<Entity>[]` with `useMemo`. Include `deleteDialog` (not `deleteDialog.open`) in the deps array to satisfy the React Compiler.

### 9. React Compiler lint rules

- Call all hooks unconditionally — never inside an `if`
- Use the whole `deleteDialog` object in `useMemo` deps, not a property of it
- Avoid `setState` inside `useEffect`; prefer derived state with `useMemo`

---

## Mandatory Page Structure

```
useDocumentTitle
store selectors (never destructure)
branch selectors (if branch-scoped)
permission checks
useFormModal + useConfirmDialog
useEffect → fetch on branch change (if branch-scoped)
useMemo → filter by branch (if branch-scoped)
useMemo → sort
usePagination
useActionState (submitAction + useCallback)
state.isSuccess guard → modal.close()
openCreate / openEdit handlers (useCallback)
handleDelete handler (useCallback, async)
columns (useMemo)
--- guard: !selectedBranchId → fallback card ---
return JSX:
  <> <title/> <meta/>
    <PageContainer helpContent={...} actions={...}>
      <Card>
        {isLoading ? <TableSkeleton> : <Table>}
        <Pagination>
      </Card>
      <Modal footer={Cancel + Submit}>
        <form id="entity-form" action={formAction}>
          HelpButton (size="sm") + label
          ... form fields using modal.formData ...
        </form>
      </Modal>
      <ConfirmDialog>
        <CascadePreviewList> (if applicable)
      </ConfirmDialog>
    </PageContainer>
  </>
```

---

## Code Examples

### Hook trio setup

```typescript
const modal = useFormModal<EntityFormData, Entity>(initialFormData)
const deleteDialog = useConfirmDialog<Entity>()

const {
  paginatedItems,
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  setCurrentPage,
} = usePagination(sortedItems)
```

### useActionState form handling

```typescript
const submitAction = useCallback(
  async (_prevState: FormState<EntityFormData>, formData: FormData): Promise<FormState<EntityFormData>> => {
    const data: EntityFormData = {
      name: formData.get('name') as string,
      is_active: formData.get('is_active') === 'on',
    }

    const validation = validateEntity(data)
    if (!validation.isValid) {
      return { errors: validation.errors, isSuccess: false }
    }

    try {
      if (modal.selectedItem) {
        await updateEntityAsync(modal.selectedItem.id, data)
        toast.success('Actualizado correctamente')
      } else {
        await createEntityAsync(data)
        toast.success('Creado correctamente')
      }
      return { isSuccess: true, message: 'Guardado correctamente' }
    } catch (error) {
      const message = handleError(error, 'EntityPage.submitAction')
      toast.error(`Error al guardar: ${message}`)
      return { isSuccess: false, message: `Error: ${message}` }
    }
  },
  [modal.selectedItem, updateEntityAsync, createEntityAsync]
)

const [state, formAction, isPending] = useActionState<FormState<EntityFormData>, FormData>(
  submitAction,
  { isSuccess: false }
)

// Close modal on success — at render time, not inside the action
if (state.isSuccess && modal.isOpen) {
  modal.close()
}
```

### Columns with correct deps

```typescript
const columns: TableColumn<Entity>[] = useMemo(
  () => [
    // ...
  ],
  // CORRECT: use deleteDialog object, not deleteDialog.open
  [openEditModal, deleteDialog, canEdit, canDeleteEntity]
)
```

---

## Resources

This skill originated from the project’s agent skill. If the referenced Dashboard files do not exist in this repo, treat this as a UI/UX pattern template.
