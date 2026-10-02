# 20261002-0321-release-brand-wordmark Match the brand wordmark color and publish v0.19.27

- **status**: implementing
- **createdAt**: 2026-10-02 03:21
- **approvedAt**: 2026-10-02 05:16 (entry polling and header sizing extension; original color/publication scope approved at 03:21)
- **relatedTask**: 20261002-0321-release-brand-wordmark

## Context

The header renders a decorative MerdeckMark and the Merdeck brand-name span. The logo background, synchronized status and path-copy icons already consume primary; the wordmark inherits foreground instead. Light/dark primary values are defined centrally in index.css.

## Proposal

Set brand-name color to var(--primary), preserving its existing typography and responsive visibility. Verify browser-painted color equality with the logo and text contrast in both themes. Complete local/source checks, then publish v0.19.27 through native tag acceptance and verified public assets.

## Risks

The theme variable must remain readable against the header in both schemes. Release artifacts must retain the exact checked tag/commit identity.

## Scope

The original scope covers one stylesheet declaration, disposable browser evidence, delivery tracking and release acceptance documentation. The approved extension below adds current-session entry-mutation observation and focused tests, plus consistent header icon/control sizing and existing browser assertions. No dependency, renderer, storage or authentication changes.

## Alternatives

A literal teal would lose theme consistency. The existing primary variable is the established brand color requested by the owner.

## Approved additional scope: entry mutation polling and header sizes

Two complete clean-source local checks of a4a92d531b9dddf22616749e16d44c9853dc812b failed the compiled artifact's existing create/rename/move/delete browser audit. The first observed an unexpected revision HTTP 403; the second observed HTTP 409. All operation assertions completed, both bundled suites passed 108 cases, and all fixture cleanup checks passed. Hosted source acceptance passed for this exact candidate. Neither failed complete local check qualifies the release for publication.

The entries mutation cancels current document/revision queries once, but their observers remain enabled and may restart polling while a file operation is still pending. Repository move validation uses a temporary two-link interval and retains strict identity/version checks; the observed HTTP responses alone do not establish their exact origin. Preserve the failed evidence and establish a deterministic frontend reproducer before extending the implementation.

Proposed scope: disable document and revision query observers while entry mutations in the current workspace generation are pending, retain cancellation of already active reads before starting the operation, and restore observation after success or failure. Cover polling suppression, active-read cancellation and resumed observation in use-workspace-entries.test.tsx. Keep save/external-observation behavior and filesystem admission/identity checks intact. Review the affected mutation/navigation call chain, then repeat the complete clean-source local/source/native and publication checks for the final committed candidate.

Expected application scope is use-workspace.ts and its focused entry tests, in addition to the already completed stylesheet change. Risk: observer suspension must not leak across session changes or prevent observation after a refused operation; existing save race tests must continue to pass. Alternatives are to retain the color commit without publishing yet, or to investigate a different fix if the deterministic reproducer disproves the proposed ordering. Suppressing unexpected-response audits or weakening repository validation is outside this proposal.

The owner explicitly approved the concurrency proposal on 2026-10-02 05:16 and also requested consistent sizes for the circled phone header controls. The copy/synchronization glyphs are already 20px, while the AI and overflow glyphs are 16px. Match the header action glyphs to 20px and preserve existing 44px phone touch targets and 32px desktop control height. Verify rendered dimensions, alignment and containment at 320/360/390px using the existing header browser case; retain the Save label and synchronization state marker. This adds only the existing stylesheet and header browser assertions to the approved scope.

Follow-up: taskist #62. Failed logs and snapshots are preserved under /home/alan/warehouse/merdeck-brand-wordmark/first-local.* and second-local.*.
