# 20261002-0321-release-brand-wordmark Match the brand wordmark color and publish v0.19.27

- **status**: implementing
- **createdAt**: 2026-10-02 03:21
- **approvedAt**: 2026-10-02 03:21 (explicit color request and established publication authorization)
- **relatedTask**: 20261002-0321-release-brand-wordmark

## Context

The header renders a decorative MerdeckMark and the Merdeck brand-name span. The logo background, synchronized status and path-copy icons already consume primary; the wordmark inherits foreground instead. Light/dark primary values are defined centrally in index.css.

## Proposal

Set brand-name color to var(--primary), preserving its existing typography and responsive visibility. Verify browser-painted color equality with the logo and text contrast in both themes. Complete local/source checks, then publish v0.19.27 through native tag acceptance and verified public assets.

## Risks

The theme variable must remain readable against the header in both schemes. Release artifacts must retain the exact checked tag/commit identity.

## Scope

One existing stylesheet declaration, disposable browser evidence, delivery tracking and release acceptance documentation. No component, dependency, layout, renderer, storage or authentication changes.

## Alternatives

A literal teal would lose theme consistency. The existing primary variable is the established brand color requested by the owner.

## Additional proposal: entry mutation polling (pending approval)

Two complete clean-source local checks of a4a92d531b9dddf22616749e16d44c9853dc812b failed the compiled artifact's existing create/rename/move/delete browser audit. The first observed an unexpected revision HTTP 403; the second observed HTTP 409. All operation assertions completed, both bundled suites passed 108 cases, and all fixture cleanup checks passed. Hosted source acceptance passed for this exact candidate. Neither failed complete local check qualifies the release for publication.

The entries mutation cancels current document/revision queries once, but their observers remain enabled and may restart polling while a file operation is still pending. Repository move validation uses a temporary two-link interval and retains strict identity/version checks; the observed HTTP responses alone do not establish their exact origin. Preserve the failed evidence and establish a deterministic frontend reproducer before extending the implementation.

Proposed scope: disable document and revision query observers while entry mutations in the current workspace generation are pending, retain cancellation of already active reads before starting the operation, and restore observation after success or failure. Cover polling suppression, active-read cancellation and resumed observation in use-workspace-entries.test.tsx. Keep save/external-observation behavior and filesystem admission/identity checks intact. Review the affected mutation/navigation call chain, then repeat the complete clean-source local/source/native and publication checks for the final committed candidate.

Expected application scope is use-workspace.ts and its focused entry tests, in addition to the already completed stylesheet change. Risk: observer suspension must not leak across session changes or prevent observation after a refused operation; existing save race tests must continue to pass. Alternatives are to retain the color commit without publishing yet, or to investigate a different fix if the deterministic reproducer disproves the proposed ordering. Suppressing unexpected-response audits or weakening repository validation is outside this proposal.

Approval for this additional concurrency scope is pending. No polling implementation has been changed. Follow-up: taskist #62. Failed logs and snapshots are preserved under /home/alan/warehouse/merdeck-brand-wordmark/first-local.* and second-local.*.
