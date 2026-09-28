# 20260928-2039-sequence-diagram-palette Give sequence diagrams a restrained colour palette

- **status**: completed
- **priority**: P2
- **owner**: frontend-maintainer-6qew
- **createdAt**: 2026-09-28 20:39

## Description

Sequence diagrams render in flat grey and near-black: the renderer maps only the neutral diagram tokens (`--diagram-node`, `--diagram-node-border`, `--diagram-line`, `--diagram-ink`, `--diagram-paper`) into Mermaid's base theme, so participants are grey boxes, arrows and the autonumber circles are near-black, and notes fall back to Mermaid's default yellow. Unlike flowcharts, a sequence diagram cannot colour itself: the source policy refuses configuration, `box` and `rect`, and Mermaid has no `classDef` for sequences. The project owner compared the preview with the same source rendered under a pale blue / slate palette on 2026-09-28 and asked for the preview to adopt that direction.

Acceptance: on the light diagram sheet, which the preview uses in both interface themes, sequence participants, lifelines, messages, autonumber circles, notes and `alt`/`loop` labels take dedicated diagram tokens with readable contrast; flowchart node colours, the source policy, the sanitizer and the trusted renderer settings are unchanged.

## ActiveForm

Theming sequence diagrams from dedicated tokens.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- Plan: [20260928-2039-sequence-diagram-palette](../plan/20260928-2039-sequence-diagram-palette.md)
- Rebase: the first implementation was made on a stale local checkout of the pre-reset history (0967b73) before `origin/main` was reset to the v0.19.10 tree. That work was set aside and the task was re-investigated on the current tree, where diagram colours come from light-only `--diagram-*` tokens used in both interface themes.
- Investigation (current tree): `renderer.ts` maps `--diagram-node`, `--diagram-node-border`, `--diagram-line`, `--diagram-ink`, `--diagram-paper` and the cluster tokens into Mermaid 11.17.2's base theme, which derives every sequence colour from them; notes fall back to `#fff5ad`. The `--diagram-*` tokens live in `:root` only, so the sheet is light in both interface themes. The source policy refuses configuration, `box` and `rect`, and sequences have no `classDef`, so only the viewer theme can colour them. The note and label-box variables are also read by state and class diagram notes.
- Implementation: eight light-sheet tokens (`--diagram-actor-bg`, `-actor-border`, `-actor-ink`, `-lifeline`, `-signal`, `-note`, `-note-border`, `-note-ink`) in `:root` of `web/src/index.css`, mapped by a `sequenceColors()` helper in `renderer.ts` onto the sixteen sequence variables; `signalTextColor` takes `--diagram-ink` and `sequenceNumberColor` takes `--diagram-paper`. Flowchart variables are unchanged. The new render-queue test failed before the change and passes after it.
- Verification (2026-09-28, `fcd07bd` plus this change, Bun 1.4.2, frozen installs unchanged): `bun run --cwd web lint` has no errors (one existing `react/set-state-in-effect` warning in `agent-chat.tsx`, untouched); `typecheck` clean; `bun run --cwd web test:coverage` 34 files, 586 tests passed; root `bun run lint` clean; `bun run build` succeeded (existing chunk-size warning only); `git diff --check` clean. The storage-dependent backend suite and the browser e2e suite were not rerun for this frontend-only theme change.
- Browser evidence: the built service ran from this checkout on 127.0.0.1:8799 over a root holding two real sequence diagrams (autonumber, nested `alt`, notes). In both interface themes the sheet stayed `oklch(1 0 0)` and computed colours matched the tokens: participant fill `rgb(235, 243, 254)`, stroke `rgb(145, 171, 201)`, text `rgb(30, 58, 95)`; lifeline `rgb(180, 191, 206)`; message and autonumber circle `rgb(71, 85, 105)` with white numbers; note fill `rgb(248, 250, 252)`, border `rgb(217, 225, 235)`, text `rgb(51, 65, 85)`; `alt` label box and text likewise. Text contrast: participant 10.3, autonumber 7.6, note 9.9; lifelines are deliberately quiet at 1.9. Screenshots are in ignored `tmp/preview/`. The server was stopped afterwards.
- Follow-ups recorded in tk (merdeck #47, #48): lifelines run far below the last message (pre-existing, still present on this tree), and a larger sequence title.

- complete: Sequence palette tokens delivered on the current tree; see Notes for verification.
