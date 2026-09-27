# 20260915-0230-compact-mobile-drawer-header Compact the mobile drawer header

- **status**: completed
- **priority**: P1
- **owner**: mobile-drawer/20260915-0230
- **createdAt**: 2026-09-15 02:30

## Description

Remove the visible `Project files` heading and introductory description from the mobile file drawer, preserving the close control and the explorer's browsing behavior. Acceptance: the drawer opens directly into the explorer without the redundant text block; its accessible dialog name and close action remain available; files, folders, search, filters, pagination, drafts, and desktop explorer behavior remain unchanged; and a short-screen mobile regression proves the reclaimed space.

## ActiveForm

Compacting the mobile file drawer header.

## Dependencies

- **blocked by**: 20260915-0119-investigate-mobile-project-files-listing (completed)
- **blocks**: (none)

## Notes

- Authorization (2026-09-15): the owner explicitly requested removal of both the visible `Project files` heading and its drawer description because they waste space.
- Investigation (2026-09-15): `Workspace` renders the file drawer through one `DialogContent` containing the visible title, description, and `FileTree`. The shared Base UI wrapper supplies a top-right close control. The existing drawer browser test intentionally requires the visible description and measures its wrapped lines. When the visual header is removed, that close control would overlap the explorer heading's right-side action buttons unless the explorer heading reserves a close-control rail. A visually hidden `DialogTitle` retains the dialog's accessible name without consuming layout space; the description can be removed entirely.
- Proposal (2026-09-15): replace the visible title with a visually hidden semantic title, remove the description, reserve the close-control rail inside the explorer heading, and update the short-screen prototype to match. Add a red/green browser regression for no visible heading or description, retained dialog name, retained close action, and reclaimed first-row position. No directory API, data, filter, pagination, draft, desktop complementary explorer, or deployment behavior changes.
- Implementation (2026-09-15): the drawer now retains a visually hidden `Project files` dialog title, removes the visible description, and starts directly with the explorer. The drawer-scoped explorer heading reserves a 52px close-control rail so its create and refresh actions do not overlap the shared close button. Desktop explorer presentation and file-browsing behavior are unchanged.
- Regression coverage (2026-09-15): the pre-change built drawer suite failed because the description remained visible and the explorer heading started below the old text block. The corrected three-case suite passed at 390, 360, and 315 CSS-pixel viewports. It checks absent visible text, preserved accessible naming, focus restoration, reclaimed top space, and non-overlap between heading actions and the close control.
- Design evidence (2026-09-15): the regular and short-screen self-contained mobile-drawer prototypes now use the compact top rail. Their served-byte and four-group browser checks passed. Both remain `needs-review` and do not represent approved visual design.
- Verification (2026-09-15): frozen installs, lint, strict type checks, 473 frontend coverage tests, builds, release tests, compiled browser acceptance, and bundle browser acceptance passed. The initial aggregate run hit a transient, unrelated directory 503 during an external-rename acceptance case; a fresh complete 13-case acceptance-spec run and the subsequent aggregate browser runs passed. The final evidence-export step rejects an uncommitted worktree by design, so `bun run check:ci` cannot report final success before a reviewed commit. `git diff --check` passed.
- Review (2026-09-15): local shared-policy and TypeScript frontend review found no actionable introduced issue.

- complete: Visible mobile drawer header removed; focused browser and prototype checks passed.
