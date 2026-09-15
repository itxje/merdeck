# 20260915-0119-investigate-mobile-project-files-listing Investigate the mobile project-files listing

- **status**: completed
- **createdAt**: 2026-09-15 01:19
- **approvedAt**: 2026-09-15 01:30 UTC
- **relatedTask**: 20260915-0119-investigate-mobile-project-files-listing

## Context

The latest release fixes navigation after a recursive type search; it does not change the mobile drawer's directory response or list height. The deployed session identifies itself as `0.11.2`, and its root directory endpoint returns 20 directories in a complete page. At a 315 by 533 CSS-pixel mobile visual viewport, all corresponding rows are rendered but the `Files and diagrams` navigation region collapses to no usable client height. The first row can appear at the boundary while the remainder is clipped by the sheet.

The cause is layout, not a configured-root, API, or directory-content issue: the mobile rule fixes the tree at `min(64dvh, 36rem)`, while the tree's fixed controls and multi-line pagination footer need more vertical space than that on a short visual viewport. Existing drawer coverage exercises 390 by 844 and 360 by 844 only, so it does not observe the collapsed list.

## Proposal

Repair only the short mobile sheet state (maximum width 700px and short visual viewport) with these bounded changes:

1. Reserve usable vertical space for the folder/file navigation region, sized for at least two 44px rows at the reported 315 by 533 viewport while keeping the sheet within the dynamic viewport.
2. Compress only the settled pagination/status footer in that short state. A disabled `Next page` control must not consume a full row; when another page exists, its enabled control remains visible and reachable.
3. Preserve the existing 44px touch targets, breadcrumbs, search, file-type selector, folder actions, page navigation semantics, empty-folder compact state, desktop explorer, and non-file dialogs.
4. Add a 315 by 533 browser regression fixture with multiple sibling folders. It will assert a non-zero, at-least-two-row listing viewport, reachable later folders by scrolling, and sheet containment. Retain the existing taller mobile and desktop checks.
5. Revise the existing mobile drawer design artifact as a new short-screen version, record it as `needs-review`, and extend its HTTP browser check to include the short viewport before carrying the same layout decisions into the application.

The pre-change regression will fail because the list navigation region has no usable height; after the repair it must pass with every fixture folder reachable.

## Risks

Changing mobile height rules without a short-viewport footer treatment could still clip the list or regress the compact empty-folder state. The repair must use dynamic viewport units so Safari toolbar changes remain within the visible viewport. The design artifact is an assumed implementation aid and remains `needs-review`; it is not user approval.

## Scope

Included: mobile drawer layout, its short-screen design artifact, and focused browser coverage. Excluded: configured-root changes, API or server changes, deployment restarts, file-content mutations, release publication, unrelated layout work, and arbitrary filesystem access.

## Alternatives


1. Make the whole sheet scroll. Rejected: it separates the folder list from its controls and footer, creates nested-scroll ambiguity, and does not guarantee that the list itself receives a visible row area.
2. Hide directory entries or reduce the server page size. Rejected: the server already returns the correct entries; this would conceal the defect and reduce browsing capability.
3. Increase the tree height alone. Rejected: the expanded footer can still consume the gained space on a short viewport, so the list remains vulnerable to collapse.

## Annotations

- The owner asked what changed and reported the remaining mobile observation on 2026-09-15. The owner explicitly approved implementation of the proposal on 2026-09-15.

## Implementation record

Implemented the bounded short-screen treatment. At a maximum width of 700px and maximum height of 700px, the drawer uses a dynamic viewport-constrained tree height, reserves an 88px minimum for both the immediate directory navigation and recursive search-results navigation, removes the visual scope hint from layout while preserving it for assistive technology, and compacts the footer into a two-column grid. A disabled `Next page` control is hidden; an enabled control remains visible, full-width, and reachable.

The new browser fixture creates 101 sibling directories and one nested Mermaid file. It proves the first and hundredth loaded folder can be reached by scrolling at 315 by 533 CSS pixels, verifies the enabled pagination control stays inside the sheet, and verifies a file-type recursive search keeps its result navigation at least two touch rows tall. The earlier failure measured a zero-height directory navigation region; the corrected fixture measures 88px.

The prototype was carried into a new self-contained [short-screen mobile drawer](../../designs/merdeck/Mobile-file-drawer-short-screen.html), registered as `needs-review`. It communicates assumed visual defaults only and does not establish design approval.

## Verification

The short-screen prototype HTTP check passed 4 groups. Root and frontend lint, frontend strict type checking, and 473 frontend unit tests passed with 93.05% statements, 89.05% branches, 92.65% functions, and 93.24% lines. The isolated built three-case drawer suite passed; the new full compiled browser run also passed its drawer regression as case 26.

The prescribed frozen-install aggregate was run from the project tmux session with an explicit overlayfs fixture parent and separate tmpfs refusal parent. File acceptance, storage checks, source checks, physical directory checks, release tests, compilation, and the initial compiled browser cases passed. The aggregate did not finish successfully because the unrelated UTF-8 source-cap browser case received a directory 503 during the 67-case cumulative run; it ended with 65 passed, 1 skipped, and 1 failed. A fresh-service isolated run of that exact case passed. This limitation is retained rather than treated as a passing aggregate.

Local diff review under the shared policy and TypeScript frontend/backend packs found no actionable introduced finding. The short-screen prototype remains `needs-review`. Deployment, release publication, and unrelated server behavior are outside this completed implementation.
