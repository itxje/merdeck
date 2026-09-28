# 20260928-2057-sequence-lifeline-fit Fit a sequence diagram to its messages, not to its placeholder lifelines

- **status**: completed
- **priority**: P2
- **owner**: frontend-maintainer-6qew
- **createdAt**: 2026-09-28 20:57

## Description

A sequence diagram rendered with `mirrorActors: false` shows a long empty strip below its last message and is fitted far too small: the managed-node-mode enrollment figure opens at 34% with about 770 px of bare lifelines under the last message. Mermaid 11.17.2 draws each lifeline to a placeholder `y2="2000"` when no bottom participants are drawn and relies on its own `viewBox` to clip the rest; the preview replaces that `viewBox` with the SVG's `getBBox()`, which includes the full lifelines. Acceptance: such a diagram is fitted to its participants, messages and frames, the lifelines stay in the diagram down to the fitted edge, and diagrams whose lifelines end at bottom participants, as well as every other family, are fitted as before.

## ActiveForm

Fitting sequence diagrams to their content.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- Reported by the project owner on 2026-09-28 with a screenshot of the enrollment figure; tracked earlier as tk merdeck #47.
- Investigation: `web/src/features/preview/preview.tsx` sets the `viewBox` from `node.getBBox()` (padded by 16) so every family is fitted to its drawn content, and already hides Gantt `.today` markers during that measurement for the same reason. The Merdeck render profile of the enrollment figure shows Mermaid's own `viewBox` at `-50 -50 885.5 1295` while each `line.actor-line` runs from `y1=65` to `y2=2000`; with bottom participants (`mirrorActors` true, the default) the lifelines end at those participants, which are content.
- Proposal: measure sequence lifelines out the same way as the Gantt marker, hiding `.actor-line` elements while `getBBox()` runs and restoring them afterwards, so they stay in the diagram and are clipped at the fitted edge like Mermaid's own output. A failing `preview.test.tsx` case first, whose `getBBox` stub reports the tall box only while a lifeline is displayed. Verification: web lint, typecheck, coverage tests, build, and a browser check that the enrollment figure fits to its messages, a default (mirrored) sequence diagram and a flowchart keep their fitted sizes.
- Approval: the owner replied "proceed" on 2026-09-28.
- Implementation: `preview.tsx` measures `.actor-line` elements out alongside the Gantt `.today` markers, hiding them while `getBBox()` runs and restoring them afterwards. The new `preview.test.tsx` case failed first (fitted height 2032 against 1232) and passes after the change.
- Verification (2026-09-28, on `8ed69eb`, Bun 1.4.2): `bun run --cwd web lint` has no errors (the existing `agent-chat.tsx` warning only); `typecheck` clean; `bun run --cwd web test:coverage` 34 files, 587 tests passed; root `bun run lint` clean; `bun run build` succeeded; `git diff --check` clean. The storage-dependent backend suite and the browser e2e suite were not rerun for this frontend-only change.
- Browser evidence: the built service ran from this checkout on 127.0.0.1:8799 over a disposable root. The enrollment figure (`mirrorActors: false`) is now fitted to `viewBox` height 1304 instead of 2069 and opens at 55% instead of 34%, with its three lifelines displayed down to the fitted edge; a default sequence diagram keeps its bottom participants inside the fitted box (bottom 300, box bottom 316); a flowchart has no lifelines and is unaffected. Screenshots are in ignored `tmp/preview/fit-*.png`. The server was stopped afterwards.

- complete: Lifelines measured out of the fit; see Notes for verification.
