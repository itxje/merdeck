# 20260914-1105-search-file-types List chosen file types from subfolders

- **status**: completed
- **createdAt**: 2026-09-14 11:05
- **approvedAt**: 2026-09-14 11:05 (the owner reported that choosing `.mmd` or `.md` still leaves out files in subfolders, a remaining part of the subfolder search defect they asked on 2026-09-13 to fix and release directly)
- **relatedTask**: 20260914-1105-search-file-types

## Context

[The directory search](20260913-2045-directory-search.md) walks below the browsed folder only while text is typed. With an empty box, the file type choice (`All`, `.mmd`, `.md`) still filters just the loaded page window, so choosing `.md` at the root shows none of the Markdown files kept in subfolders. With text typed, the browser applied the type choice to the returned matches after the 200-match budget had already been spent on every type.

## Proposal

1. **Endpoint.** `GET /diagrams/search` accepts an optional `kind` of `mermaid` or `markdown`. `query` becomes optional when `kind` is given; a request still needs at least one of them, and every other rule stays. With a kind, only files of that kind match, by type alone or also by text when a query is given, while folders match only by text. The response echoes `kind`, or `null` without one, and the match budget counts only admitted entries.
2. **Interface.** Choosing `.mmd` or `.md` searches the browsed folder and its subfolders, with or without text, and the results replace the folder listing exactly as a text search does. `All` with an empty box returns to the folder listing. A result belongs to its folder, text and type together. Empty and partial results name the file type when no text is typed, and the scope hint says that search and file types both look in subfolders. Because a remembered type now keeps results on screen, unsaved drafts whose files have no result row stay listed below the results, as they already are below the listing.
3. **Version.** The search request and response change, so the release raises the minor position under the README rule.

## Risks

- A remembered file type now opens the explorer as a flat list of that type rather than the folder listing, until `All` is chosen. The type buttons stay beside the list, and the browse location still sets the scope.
- A type-only search from a large root walks until a budget stops it, as a short text query already does, and says so.

## Scope

`src/shared/contracts.ts`, `src/modules/diagrams/directory.ts` and their service and HTTP tests; `web/src/features/workspace/api.ts`, `use-directory-search.ts`, `file-tree.tsx`, `workspace.tsx` and their tests; the browser cases that exercised the page-window type filter; README, architecture and changelog. Out of scope: the page-window filter of an explorer without search, content search and result ordering.
