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
