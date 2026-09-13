# 20260913-2045-directory-search Search a folder and its subfolders

- **status**: completed
- **priority**: P1
- **owner**: Frontend and backend maintainer
- **createdAt**: 2026-09-13 20:45

## Description

After directory navigation shipped, the explorer filter only covered the loaded folder, so the project owner could no longer find diagrams kept in subfolders. Acceptance, as proposed in [the plan](../plan/20260913-2045-directory-search.md): a name search below the browsed folder that respects every existing path, visibility and exclusion rule, stays within explicit budgets, reports a partial result honestly, and presents its matches in the explorer with file opening and folder browsing.

## ActiveForm

Searching a folder and its subfolders.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- Implementation (2026-09-13): `DirectoryPager.searchDirectory` walks breadth-first through `withListingDirectory`, reading names from the same held stream a page reads and classifying each through the view's entry check, so hidden, ignored, hard-linked and unsupported names never appear. It stops at 20,000 names, 200 matches or 60 percent of the operation deadline, skips a subfolder that changes, vanishes or refuses access while marking the result incomplete, and closes every stream it opens. `GET /diagrams/search` validates its query strictly. The interface debounces the typed text, keeps results bound to the text and folder they were searched for, and replaces the folder listing while a query is active.
- Correction during implementation (2026-09-13): the folder listing was first only hidden while a query was active, which left a second row for the same file in the page and made existing drawer and file-operation cases act on an invisible copy. The listing now steps aside entirely during a search. Existing cases that typed into the filter to exercise the loaded-window filter were moved to the file type filter, which still covers folders staying navigable, and the empty-result message they expected now names the search.
- Verification (2026-09-13, main checkout, pinned Bun 1.4.2, inside the project tmux session): three service cases cover subfolder matches with hidden, generated and unsupported names excluded, folder-name matches and root searches; the 200-match budget with a partial result; and refusals for empty, whitespace, oversized and control-character queries and for escaping paths. An HTTP case proves the route answers, closes every stream it opened and refuses other methods and unknown keys. A component case covers debounced querying, pending and partial states, relative ordered paths, the file type choice, opening a file and browsing into a folder. A browser case creates nested folders, finds two diagrams several levels below the root without opening those folders, opens one with its source loaded and returns to the folder listing when the text is cleared. `bun run check` passed with 254 backend tests and 466 frontend tests across 24 files, and the complete browser suite passed 64 of 64.
