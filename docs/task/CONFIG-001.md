# CONFIG-001 Default the tree scan to a wide, shallow walk

- **status**: completed
- **priority**: P2
- **owner**: Backend maintainer
- **createdAt**: 2026-09-12

## Description

The project owner runs a root that also holds unrelated directories, and the default scan of 1,000 entries at depth 16 truncated before it reached their diagrams: a deep walk spends the entry budget inside the first large subtree it meets. They measured and chose four levels with 8,000 entries, verified that listing on their own root, and asked for those to become the defaults. Acceptance: a service without explicit settings lists four complete levels within 8,000 entries; both remain configurable within their existing maximums; the documented defaults match; and nothing else about discovery, truncation or access changes.

## ActiveForm

Defaulting the tree scan to a wide, shallow walk.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- Investigation (2026-09-12): the scan is breadth-first with two budgets, `maxTreeEntries` and eight times that many directory visits, and a directory deeper than `maxTreeDepth` is listed but never opened, so depth bounds the work rather than merely hiding files. Measured on the owner's root: 23 visible entries at one level, 256 within two, 1,255 within three and 6,414 within four, against roughly 326,000 in the whole tree. At four levels the scan reads about 12,500 raw entries against a 64,000-visit budget and hashes 6.8 MiB of diagram bytes against the 32 MiB cap, so the wider entry budget costs little while the shallow depth keeps an unrelated subtree from consuming it.
- Implementation (2026-09-12): the defaults become 8,000 entries and depth 4, with both maximums unchanged at 10,000 and 32. `.env.example`, the README file-discovery note and the architecture defaults state the new values, and the README says plainly that diagrams kept deeper than four levels need an explicit `MERDECK_MAX_TREE_DEPTH`.
- Verification (2026-09-12, main checkout, pinned Bun 1.4.2, inside the project tmux session): a new configuration case pins both defaults and proves each is still overridden by its variable. `bun run check` passed with 204 backend tests across 9 files and 234 frontend tests across 19 files, and the complete browser suite passed 45 of 45. On the owner's deployment the same values already list 1,969 entries and 580 files across four complete levels, where the previous defaults returned 1,000 truncated entries.
