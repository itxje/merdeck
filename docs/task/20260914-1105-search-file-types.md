# 20260914-1105-search-file-types List chosen file types from subfolders

- **status**: completed
- **priority**: P1
- **owner**: Frontend and backend maintainer
- **createdAt**: 2026-09-14 11:05

## Description

After the subfolder search shipped, the project owner reported that choosing `.mmd` or `.md` in the explorer still does not show files kept in subfolders. Acceptance, as proposed in [the plan](../plan/20260914-1105-search-file-types.md): a chosen file type lists the matching files below the browsed folder with or without text, within the existing search budgets and exclusions, the type is applied by the service before the match budget, and `All` with an empty box returns to the folder listing.

## ActiveForm

Listing chosen file types from subfolders.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- Investigation (2026-09-14): `file-tree.tsx` starts a search only when `filter.trim()` is not empty; otherwise the type choice filters `entries`, which hold only the loaded page window of the browsed folder. `use-directory-search.ts` enables its query only for nonempty text, and `GET /diagrams/search` requires a query of at least one character and knows nothing of file types, so the browser filtered types after the service had already spent its 200-match budget.
- Implementation (2026-09-14): the search request accepts an optional `kind` and needs text only when no kind is given. `searchDirectory` admits a file only when its kind matches and a folder only when there is text, before counting matches, and echoes the kind; the decoder requires that echo and refuses a file of another kind. The search hook keys its query by folder, text and kind and runs for a chosen kind with an empty box. The explorer binds results to all three, names the file type in empty and partial messages, and lists retained drafts below search results as well as below the listing, without repeating a file that already has a result row. Browser cases that used the page-window type filter now choose a type to list files below a folder and return to the listing with **All**.
- Verification (2026-09-14, main checkout, pinned Bun 1.4.2, inside the project tmux session): a service case lists Markdown and Mermaid files below a folder by kind alone without hidden files or any folder, and combines kind with text while folders still match by text; the budget case finds a Markdown file by kind that 200 Mermaid matches would otherwise crowd out. The HTTP case answers a kind-only search, closes its streams, and refuses `kind=all`, an empty or differently cased kind, a repeated kind and whitespace-only text. Decoder, transport and component cases cover the echoed kind, a request without empty text, results bound to their type, the type-named messages and retained drafts beside results. `bun run check` passed with 255 backend tests and 473 frontend tests across 24 files, and the complete browser suite passed 64 of 64.
