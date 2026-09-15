# 20260915-0230-compact-mobile-drawer-header Compact the mobile drawer header

- **status**: completed
- **createdAt**: 2026-09-15 02:30
- **approvedAt**: 2026-09-15 02:30 UTC
- **relatedTask**: 20260915-0230-compact-mobile-drawer-header

## Context

The mobile Project files drawer currently reserves visible space for a `Project files` title and an explanatory description before the explorer. The owner identified both lines as unnecessary. The right-side close control, explorer controls, and list behavior remain necessary. Removing a visual dialog title must preserve an accessible dialog name.

`Workspace` owns both visible text nodes. Its shared dialog primitive supplies the top-right close control, while `FileTree` puts create and refresh controls at the right side of its first `EXPLORER` row. Removing the visual header without a layout adjustment would place those actions beneath the close control. The existing drawer browser test expects the description and measures its text lines, so it is a precise pre-change regression surface.

## Proposal

1. Replace the visible title with a visually hidden semantic title and remove the description, retaining the close control while moving the explorer upward.
2. Reserve the close-control rail inside the `EXPLORER` row so its create and refresh actions cannot overlap the close target, without adding another header row.
3. Add a focused mobile browser regression proving the visible text is absent, the dialog remains named, the close control works, and the explorer remains reachable.
4. Revise the self-contained short-mobile drawer prototype to show the compact header, retain its `needs-review` status, and carry the same spacing into the application.

## Risks

- Removing the title without a hidden semantic replacement would make the dialog unnamed for assistive technology.
- Over-compressing the top inset could impair the close target or safe-area spacing.
- The request applies to the mobile drawer only; the desktop complementary explorer and its labels must remain unchanged.

## Scope

Included: the mobile drawer's visible text header, its accessible labelling, short-screen layout, focused browser coverage, and a new needs-review prototype. Excluded: directory API responses, configured-root contents, file data, search/filter semantics, desktop explorer presentation, dependencies, and deployment.

## Alternatives

Hide the description only: rejected because the owner also requested removal of the `Project files` title line. Remove the close control with the title: rejected because it would remove the drawer's explicit dismissal control.

## Annotations

- The owner explicitly authorized this focused implementation on 2026-09-15. Implementation may proceed after investigation records the affected component and test coverage.
- Approval recorded 2026-09-15 02:30 UTC; implementation proceeds only within the proposal scope.

## Implementation record

The mobile drawer now keeps `Project files` as a visually hidden dialog title and removes its visible explanatory description. The file tree becomes the first visible drawer content. Its explorer heading reserves a 52px right-side rail for the shared close control, so the New file, New folder, and Refresh files actions remain reachable without another header row. The desktop complementary explorer is unchanged.

Both self-contained mobile-drawer prototypes use the same compact top rail and retain an accessible dialog name. They remain `needs-review`; this implementation does not claim approval of the assumed visual direction.

## Verification

The new browser regression failed before implementation because the drawer still contained the description and the explorer began below the visible header. After implementation, the focused built drawer suite passed all 3 cases at 390, 360, and 315 CSS-pixel viewports. It verifies the visible text is absent, the dialog is still named, the hidden title is semantic, the explorer begins in the reclaimed space, and its actions do not overlap the close target.

Both HTTP-served prototypes passed their four-group browser check, including byte identity, empty/populated states, filtering, short-screen geometry, focus restoration, and no external resources. Root and web frozen installs, lint, type checks, 473 frontend coverage tests, builds, release checks, compiled browser acceptance, and bundle browser acceptance passed during the final gate attempt. The first aggregate attempt had a transient directory 503 in an unrelated external-rename acceptance case; a fresh complete 13-case acceptance-spec run passed, as did the next aggregate's compiled and bundle browser runs.

The final `scripts/ci/evidence.ts` step intentionally rejected the uncommitted working tree because it requires clean Git provenance. That prevents `bun run check:ci` from reporting a final pass before a reviewed commit, but it is not an application-test failure. `git diff --check` passed. Local shared-policy and TypeScript frontend review found no actionable introduced issue. Deployment, commit, and release remain outside this implementation.
