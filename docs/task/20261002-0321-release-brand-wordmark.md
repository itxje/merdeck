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

## Delivery outcome and pending scope decision

The color change is committed and pushed on main at a4a92d531b9dddf22616749e16d44c9853dc812b. Exact hosted source acceptance passed in [run 36959959568](https://github.com/itxje/merdeck/actions/runs/36959959568); its downloaded provenance and reports were verified.

Both complete local acceptance attempts failed the existing compiled-artifact files.spec.ts case after all create/rename/move/delete assertions completed. The browser audit recorded HTTP 403 on the first revision request failure and HTTP 409 on the second. Each bundled suite passed 108 cases with 17 configuration-dependent skips; each compiled suite passed 107 cases, failed this single audit and skipped 17 cases. Fixture cleanup passed. Preserve first-local.log/exit/error-context.md and second-local.log/exit/error-context.md under the evidence directory; do not describe either complete local attempt as passing.

Read-only investigation found that entry mutations cancel current revision/document requests without disabling their polling observers for the duration of the operation. Repository moves create a temporary second link while enforcing file identity/version checks. The exact origin of the observed responses remains unproven. Taskist #62 records the follow-up and both failed results.

The plan now contains a concrete additional concurrency proposal for approval, covering a deterministic reproducer, observer suspension during entry mutations, cancellation of active reads, resumption after success/failure and preservation of save/external-observation behavior. This exceeds the original stylesheet scope; no polling code or filesystem guard has been changed. v0.19.27 is not tagged or published. Delivery awaits the owner's scope decision.
