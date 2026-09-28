# 20260928-2039-sequence-diagram-palette Give sequence diagrams a restrained colour palette

- **status**: completed
- **createdAt**: 2026-09-28 20:39
- **approvedAt**: 2026-09-28 20:42 (the owner replied "proceed"; after the history reset the owner approved redoing it on the current tree, where only the light sheet values apply)
- **relatedTask**: 20260928-2039-sequence-diagram-palette

## Context

`web/src/features/preview/renderer.ts` initialises Mermaid 11.17.2 with `theme: 'base'` and `themeVariables` read from CSS tokens through `tokenHex`. The preview draws every diagram on a light sheet in both interface themes: the `--diagram-*` tokens are defined in `:root` only (`--diagram-paper`, `--diagram-ink`, `--diagram-node`, `--diagram-node-border`, `--diagram-line`, `--diagram-cluster-bg`, `--diagram-cluster-border`). The base theme derives every sequence colour from the neutral ones: participant boxes are `--diagram-node` grey, arrows and the autonumber circles (filled with `signalColor`) are near-black, and notes use Mermaid's default `#fff5ad` yellow.

Authors cannot correct this per diagram. The preview's security boundary refuses configuration directives, `themeVariables`, `box` and `rect`, and sequence diagrams have no `classDef`. The only lever is the viewer theme.

Mermaid reads sequence colours from `actorBkg`, `actorBorder`, `actorTextColor`, `actorLineColor`, `signalColor`, `signalTextColor`, `sequenceNumberColor`, `noteBkgColor`, `noteBorderColor`, `noteTextColor`, `labelBoxBkgColor`, `labelBoxBorderColor`, `labelTextColor`, `loopTextColor`, `activationBkgColor` and `activationBorderColor`. Of these, the note variables are also read by state and class diagram notes; the others are sequence-only.

## Proposal

Add eight diagram tokens beside the existing ones in `:root` of `web/src/index.css` and map them in the renderer's `themeVariables`. Like the other diagram tokens they have one value, because the sheet is light in both interface themes.

| Token | Value | Mermaid variables |
|---|---|---|
| `--diagram-actor-bg` | `oklch(0.961 0.017 256.3)` | `actorBkg`, `activationBkgColor` |
| `--diagram-actor-border` | `oklch(0.732 0.052 252.2)` | `actorBorder`, `activationBorderColor` |
| `--diagram-actor-ink` | `oklch(0.346 0.074 256)` | `actorTextColor` |
| `--diagram-lifeline` | `oklch(0.801 0.024 256.1)` | `actorLineColor` |
| `--diagram-signal` | `oklch(0.446 0.037 257.3)` | `signalColor` (arrows and autonumber circles) |
| `--diagram-note` | `oklch(0.984 0.003 247.9)` | `noteBkgColor`, `labelBoxBkgColor` |
| `--diagram-note-border` | `oklch(0.907 0.016 253.9)` | `noteBorderColor`, `labelBoxBorderColor` |
| `--diagram-note-ink` | `oklch(0.372 0.039 257.3)` | `noteTextColor`, `labelTextColor`, `loopTextColor` |

Existing tokens cover the rest: `signalTextColor` ← `--diagram-ink` and `sequenceNumberColor` ← `--diagram-paper`, so the number stays legible on the slate circle. The values are the pale blue / slate palette the owner compared against. All values are opaque so the canvas hex conversion stays exact.

Flowchart variables (`primaryColor`, `lineColor`, cluster tokens) are not touched, so unstyled flowchart nodes, `classDef` colours and edges look as before.

## Risks

- State and class diagram notes change from Mermaid's default yellow to the same slate note colours. This is consistent with the new sequence notes but is a visible change outside sequences.

## Scope

- `web/src/index.css`: eight tokens in `:root`.
- `web/src/features/preview/renderer.ts`: map the sixteen sequence variables.
- `web/src/features/preview/render-queue.test.ts`: a failing test first that asserts the trusted configuration carries the token-derived sequence colours.
- Verification: web lint, typecheck and coverage tests, root lint, build, `git diff --check`; a real browser render of sequence diagrams with `alt`, notes and autonumber in both interface themes, checking the computed fills against the tokens, with screenshots under ignored `tmp/`.
- Records: task, plan and index markers, changelog entry.

Out of scope: diagram title size, fonts, spacing, flowchart colours, the source policy, deployment of the hosted instance.

## Alternatives

- **Recolour the neutral diagram tokens (`--diagram-node`, `--diagram-line`).** Rejected: they also colour every unstyled flowchart node and edge.
- **Admit `themeVariables` or `box`/`rect` in the source policy.** Rejected: the owner fixed these as part of the security boundary.
- **Keep the grey palette.** Rejected by the owner after comparing the two renders.

## Open Questions

(none)

## Annotations

(empty)
