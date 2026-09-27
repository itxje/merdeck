# BRAND-002 Show the brand mark on the sign-in page

- **status**: completed
- **priority**: P2
- **owner**: Frontend maintainer
- **createdAt**: 2026-09-10 16:43

## Description

The project owner reported on 2026-09-10 that the sign-in page still looked unchanged after the rename. The header already shows the Merdeck mark, but the sign-in card above "Open your diagram workspace" still renders the generic branch glyph that preceded the brand mark. Acceptance: the sign-in card shows the Merdeck mark in both colour schemes, the mobile Preview tab keeps its semantic pane icon, and no other screen changes.

## ActiveForm

Replacing the leftover sign-in glyph with the brand mark.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- Investigation: `web/src/features/workspace/workspace.tsx` renders `<GitBranch size={28} className="muted" />` at the top of `.login-card`; BRAND-001 replaced the header symbol (`MerdeckMark` with `.brand-symbol`) but not this card icon. The prototype has no sign-in screen, and its `GitBranch` use is the mobile Preview tab icon, which the application shares and which stays. A live screenshot of https://merdeck.example.test/ confirmed the old glyph.
- Proposal: render `MerdeckMark` in the card as a filled brand tile that reuses the header symbol's `--primary` / `--primary-foreground` tokens at a larger size through a new `.login-mark` rule. No dependency change.
- Implementation: `workspace.tsx` renders `<MerdeckMark className="login-mark" aria-hidden="true" />` in place of the branch glyph, and `web/src/index.css` adds the 44 px `.login-mark` tile with the `--radius-md` corners of the header symbol. `GitBranch` stays imported for the mobile Preview tab.
- Verification (2026-09-10, main checkout, pinned Bun 1.4.2, together with PREVIEW-002): `bun run --cwd web lint` and `typecheck` clean; `bun run --cwd web test:coverage` 137 passed (10 files); root `bun run lint` clean; `bun run build` succeeded; `git diff --check` clean. The storage-dependent backend suite and the browser suite were not rerun for this frontend-only change.
- Deployment and live evidence (2026-09-10): the hosted instance was rebuilt from `9be0477` and relaunched from the main checkout. A real Chromium session against https://merdeck.example.test/ found exactly one `svg.login-mark` and no branch glyph in the sign-in card in both colour schemes: a 44 px tile filled `oklch(0.205 0 0)` with `oklch(0.985 0 0)` strokes in light mode, and `oklch(0.922 0 0)` with `oklch(0.205 0 0)` strokes in dark mode. Screenshots are kept under ignored `tmp/`.
