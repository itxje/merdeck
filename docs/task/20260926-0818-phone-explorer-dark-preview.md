# 20260926-0818-phone-explorer-dark-preview Reset the file type on Up and make the dark preview coherent

- **status**: completed
- **priority**: P1
- **owner**: root/session-20260926-0818
- **createdAt**: 2026-09-26 08:18

## Description

The owner reports two phone issues. Tapping Up in the project files drawer while a file type is selected should return to the parent directory's All listing. A large Mermaid diagram with authored light group and node colours looks inconsistent and loses legibility against the dark preview canvas. Repair both behaviors without changing the saved diagram source, directory query contract, or editor drafts.

## ActiveForm

Completed the Up navigation reset and the stable light diagram sheet.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- Investigation: `FileTree` routes Up through `openDirectory(parentDirectory(directory))`, which only calls `browse`; the selected `kinds` remains stored and keeps the recursive type-search view. The result-folder path separately calls `chooseKinds('all')`. The first screenshot circles Up with `.mmd` selected.
- Investigation: the pictured `ai/mermaid/bkd-skill-flow.mmd` has explicit light fills on every major subgraph and light node class colours, with dark text and borders. The renderer respects those source colours while its default palette and preview canvas follow dark application tokens. A dark canvas therefore surrounds many white groups, and dark authored edge/label colours become hard to see. This is a theme/presentation conflict, not a corrupted renderer output.
- Related but separate: [20260926-0812-mobile-drawer-touch-scroll](20260926-0812-mobile-drawer-touch-scroll.md) tracks the earlier report that the phone drawer cannot be swiped.
- Verification: both focused browser tests failed before the fixes and passed afterward. The related 17 browser tests, 579 frontend unit tests, frontend lint/typecheck, and frontend build passed. A 390px dark-mode screenshot was inspected. The full clean-source CI gate runs after the local commit.

- complete: RED tests reproduced both defects; focused browser tests, 579 frontend unit tests, 17 related browser tests, frontend lint/typecheck and build passed. Full CI gate follows the clean local commit.
