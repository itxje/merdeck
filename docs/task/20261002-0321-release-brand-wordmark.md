# 20261002-0321-release-brand-wordmark Match the brand wordmark color and publish v0.19.27

- **status**: in_progress
- **priority**: P2
- **owner**: brand-wordmark/session-20261002-0321
- **createdAt**: 2026-10-02 03:21

## Description

Match the header Merdeck text to the logo's primary theme color. Verify actual light/dark colors and readability, then deliver v0.19.27 through the established complete local/source/native and public artifact checks.

## ActiveForm

Verifying entry polling, consistent header sizes and release delivery.

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

The owner approved the additional concurrency proposal on 2026-10-02 05:16 and requested matching sizes for the circled phone header controls. Continue the Full-tier delivery with a deterministic entry-polling reproducer, query observer suspension during entry mutations, cancellation of active reads and resumption after success/failure. Preserve save/external-observation behavior and filesystem guards. Match header action glyphs to the existing 20px copy/synchronization glyphs while retaining 44px phone touch targets and the Save label; verify the existing header browser case at 320/360/390px. Taskist #62 is in progress. v0.19.27 remains untagged and unpublished until final acceptance.

## Approved extension: implementation and focused acceptance

Two deterministic unit regressions first failed: while a held move was pending, revision reads increased from four to sixteen despite initial cancellation. The final implementation gives entry mutations a workspace-epoch key and uses their pending count to disable revision/document observers. Existing cancellation aborts active reads before the mutation API call; observers resume after successful or refused operations, including selection changes during the pending interval. Save mutation observation remains independent.

All 22 workspace/entry cases pass, including the four existing committed-save race scenarios. Frontend lint and types pass; four pre-existing unrelated lint warnings remain. The existing header browser case first failed on 16px action glyphs, then passed with 20px glyphs, 32px desktop control heights and aligned 44px phone controls at 320/360/390px. Copy, Save, AI and overflow controls fit without overlap or page overflow; theme menu containment and explorer actions still pass. Both inspected phone screenshots show matching sizes. Four affected production browser cases, including normal file operations and storage refusal, pass with zero unexpected errors and confirmed cleanup. The intermediate alignment assertion was corrected to compare control centers with the synchronization indicator, rather than the header's border-box center.

Local implementation review found zero actionable introduced findings. Backend filesystem validation and browser error allowances are unchanged. Focused evidence and review are under /home/alan/warehouse/merdeck-entry-polling/. Complete clean-source local/source/native acceptance and public release verification are still required.
