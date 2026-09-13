# 20260913-2045-directory-search Search a folder and its subfolders

- **status**: completed
- **createdAt**: 2026-09-13 20:45
- **approvedAt**: 2026-09-13 20:45 (the owner reviewed the proposed search endpoint and interface and said to implement and release it)
- **relatedTask**: 20260913-2045-directory-search

## Context

Directory navigation loads one folder at a time, and [its plan](20260913-1628-directory-navigation-pagination.md) deliberately limited the explorer filter to the loaded window and ruled out a recursive search. The owner reported that files in subfolders can no longer be found. No change to the window filter can reach a folder that was never listed, so the service has to walk below the chosen folder.

## Proposal

1. **Endpoint.** `GET /diagrams/search?path=<folder>&query=<text>` walks breadth-first below the folder over names only: no content read, no hashing, no parsing. It reuses the listing path of directory pages, so every folder is opened through the same descriptor-anchored ancestor checks, and each name passes the same visibility, exclusion, hard-link and extension rules. The query is 1 to 200 characters of trimmed text without control characters and matches, case-insensitively, the path below the folder, so a folder name finds its contents too.
2. **Budgets.** At most 20,000 names read, at most 200 matches, a stop at 60 percent of the operation deadline, and the configured path depth. The response is `{ path, query, entries, complete, stoppedBy, visited, skipped }`; a budget, the depth limit or a folder that changes, vanishes or refuses access marks it incomplete instead of failing, and the chosen folder itself failing still fails the request.
3. **Interface.** Typing in the explorer searches the browsed folder and its subfolders once typing pauses for 250 milliseconds. Results replace the folder listing, show paths below the folder in natural order, keep the file type choice for files, open a file on selection and browse into a folder on selection, clearing the search. An incomplete result says whether the match limit or the walk stopped it. Clearing the text returns to the folder listing. Entry mutations refresh cached results.

## Risks

- A search walks many folders in one request. The budgets bound it, and it shares the directory pager's concurrency limit and deadline.
- A result is a best-effort view of a changing namespace. It never proves a file absent, which the incomplete flag and the interface wording both state.

## Scope

`src/shared/contracts.ts`, `src/modules/diagrams/directory.ts`, `service.ts`, `routes.ts`, their tests, `web/src/features/workspace/api.ts`, a new `use-directory-search.ts`, `file-tree.tsx`, `workspace.tsx`, their tests, a browser case and the documentation. Out of scope: content search, global ordering of the folder listing, and any change to directory pages or the legacy tree.
