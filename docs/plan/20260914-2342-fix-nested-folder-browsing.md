# 20260914-2342-fix-nested-folder-browsing Fix nested folder browsing

- **status**: completed
- **createdAt**: 2026-09-14 23:42
- **approvedAt**: 2026-09-14 23:42
- **relatedTask**: 20260914-2342-fix-nested-folder-browsing

## Context

The existing Directory navigation artifact defines per-folder browsing with ancestor breadcrumbs, Up, and Root, and remains needs-review; no visual redesign is needed. A directory page lists immediate child folders, while a non-All type selection invokes the bounded recursive search endpoint. The search contract deliberately admits only matching files when a type is selected. `FileTree` clears text when opening a directory from search results but retains the selected type, so the next location immediately remains a kind-only recursive search and does not expose that location's child folders. Route validation, `useDirectory`, pagination/cursor recovery, and backend containment/depth limits are not the cause and will remain unchanged.

## Proposal

Add a focused browser regression for parent/child/grandchild/example.mmd with a selected file type. It must show that each folder can be entered and the nested file selected. On folder navigation from recursive search results, exit the search mode by resetting the selected file type to All as well as clearing text. This preserves the selected type for ordinary file filtering but ensures a user who chooses a folder returns to the established immediate-folder navigation view.

## Risks

Resetting type selection is observable only after the explicit folder-navigation action from a search result. The regression will verify selection, then the affected focused browser suites will retain pagination, stale/cursor recovery, drafts, and mobile drawer coverage. No API or server boundary changes are proposed.

## Scope

`web/src/features/workspace/file-tree.tsx` and focused explorer browser coverage. No backend, authentication, path validation, pagination, cursor, or design-artifact changes.

## Alternatives

Do not add recursive tree loading or relax global depth limits; either violates the bounded directory-navigation design. Showing direct folders alongside recursive kind-search results would create an ambiguous mixed view and require broader interaction changes.

## Annotations

- The owner explicitly authorized implementation in the 2026-09-14 repair request. This satisfies the proposal approval gate after investigation is recorded.
- The existing authorization was recorded and applied at 2026-09-14 23:42; implementation proceeded after the investigation and proposal above.
- Completed 2026-09-14: the focused regression established RED before the one-line frontend state repair. Focused and aggregate verification passed; the task record contains exact results and review outcome.
