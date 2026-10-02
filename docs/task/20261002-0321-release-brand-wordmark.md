# 20261002-0321-release-brand-wordmark Match the brand wordmark color and publish v0.19.27

- **status**: in_progress
- **priority**: P2
- **owner**: brand-wordmark/session-20261002-0321
- **createdAt**: 2026-10-02 03:21

## Description

Match the header Merdeck text to the logo's primary theme color. Verify actual light/dark colors and readability, then deliver v0.19.27 through the established complete local/source/native and public artifact checks.

## ActiveForm

Matching the wordmark color and verifying release delivery.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

The stylesheet change is trivial: one explicit color declaration on the existing brand-name selector, using the same primary variable as the logo background and header icons. No permanent test is added for this reversible presentation change. The Full-tier delivery is tracked here because release acceptance and documentation span multiple files. The explicit color request approves the implementation; the user's earlier release instruction and established publication of these UI refinements authorize v0.19.27 delivery.

Use a disposable browser check and screenshots to verify the wordmark color matches the logo in both themes and retains sufficient text contrast. Review the minimal diff, commit and push main, run both frozen installs and the complete clean-source local gate, and verify the exact hosted source candidate. Publish only after the immutable tag passes normal Linux x64/ext4 native acceptance with separate refusal storage. Verify same-run publication, public digests/checksum, annotated tag and bundle version/commit identity.

## Implementation and focused verification

The only application change sets brand-name color to the existing primary variable. A disposable real-browser check first failed because the old wordmark inherited foreground rather than the logo background color. It now passes in both themes with zero unexpected browser errors and complete fixture cleanup: actual text/logo colors match, with contrast 4.62 in light mode and 8.32 in dark mode against the painted header. Light/dark desktop screenshots have been inspected. Local implementation review found zero actionable introduced issues. Complete clean-source local/source acceptance and native publication remain pending. Evidence is under /home/alan/warehouse/merdeck-brand-wordmark/.
