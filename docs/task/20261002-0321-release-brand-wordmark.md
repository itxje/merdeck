# 20261002-0321-release-brand-wordmark Match the brand wordmark color and publish v0.19.27

- **status**: completed
- **priority**: P2
- **owner**: brand-wordmark/session-20261002-0321
- **createdAt**: 2026-10-02 03:21

## Description

Match the header Merdeck text to the logo's primary theme color. Verify actual light/dark colors and readability, then deliver v0.19.27 through the established complete local/source/native and public artifact checks.

## ActiveForm

Consistent brand colors and header sizes, with entry polling fixed, are published as v0.19.27.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

The stylesheet change is trivial: one explicit color declaration on the existing brand-name selector, using the same primary variable as the logo background and header icons. No permanent test is added for this reversible presentation change. The Full-tier delivery is tracked here because release acceptance and documentation span multiple files. The explicit color request approves the implementation; the user's earlier release instruction and established publication of these UI refinements authorize v0.19.27 delivery.

Use a disposable browser check and screenshots to verify the wordmark color matches the logo in both themes and retains sufficient text contrast. Review the minimal diff, commit and push main, run both frozen installs and the complete clean-source local gate, and verify the exact hosted source candidate. Publish only after the immutable tag passes normal Linux x64/ext4 native acceptance with separate refusal storage. Verify same-run publication, public digests/checksum, annotated tag and bundle version/commit identity.

## Implementation and focused verification

The original application change sets brand-name color to the existing primary variable. A disposable real-browser check first failed because the old wordmark inherited foreground rather than the logo background color. It now passes in both themes with zero unexpected browser errors and complete fixture cleanup: actual text/logo colors match, with contrast 4.62 in light mode and 8.32 in dark mode against the painted header. Light/dark desktop screenshots have been inspected. Local implementation review found zero actionable introduced issues. These focused checks preceded the complete acceptance recorded below. Evidence is under /home/alan/warehouse/merdeck-brand-wordmark/.

## Initial delivery checks and scope approval

The original color change was committed and pushed on main at a4a92d531b9dddf22616749e16d44c9853dc812b. Exact hosted source acceptance passed in [run 36959959568](https://github.com/itxje/merdeck/actions/runs/36959959568); its downloaded provenance and reports were verified.

Both complete local acceptance attempts failed the existing compiled-artifact files.spec.ts case after all create/rename/move/delete assertions completed. The browser audit recorded HTTP 403 on the first revision request failure and HTTP 409 on the second. Each bundled suite passed 108 cases with 17 configuration-dependent skips; each compiled suite passed 107 cases, failed this single audit and skipped 17 cases. Fixture cleanup passed. Preserve first-local.log/exit/error-context.md and second-local.log/exit/error-context.md under the evidence directory; do not describe either complete local attempt as passing.

Read-only investigation found that entry mutations cancel current revision/document requests without disabling their polling observers for the duration of the operation. Repository moves create a temporary second link while enforcing file identity/version checks. The exact origin of the observed responses remains unproven. Taskist #62 records the follow-up and both failed results.

The owner approved the additional concurrency proposal on 2026-10-02 05:16 and requested matching sizes for the circled phone header controls. Continue the Full-tier delivery with a deterministic entry-polling reproducer, query observer suspension during entry mutations, cancellation of active reads and resumption after success/failure. Preserve save/external-observation behavior and filesystem guards. Match header action glyphs to the existing 20px copy/synchronization glyphs while retaining 44px phone touch targets and the Save label; verify the existing header browser case at 320/360/390px. Taskist #62 is resolved and linked to this implementation record. v0.19.27 was kept untagged until the complete preparation checks passed; final acceptance is recorded below.

## Approved extension: implementation and focused acceptance

Two deterministic unit regressions first failed: while a held move was pending, revision reads increased from four to sixteen despite initial cancellation. The final implementation gives entry mutations a workspace-epoch key and uses their pending count to disable revision/document observers. Existing cancellation aborts active reads before the mutation API call; observers resume after successful or refused operations, including selection changes during the pending interval. Save mutation observation remains independent.

All 22 workspace/entry cases pass, including the four existing committed-save race scenarios. Frontend lint and types pass; four pre-existing unrelated lint warnings remain. The existing header browser case first failed on 16px action glyphs, then passed with 20px glyphs, 32px desktop control heights and aligned 44px phone controls at 320/360/390px. Copy, Save, AI and overflow controls fit without overlap or page overflow; theme menu containment and explorer actions still pass. Both inspected phone screenshots show matching sizes. Four affected production browser cases, including normal file operations and storage refusal, pass with zero unexpected errors and confirmed cleanup. The intermediate alignment assertion was corrected to compare control centers with the synchronization indicator, rather than the header's border-box center.

Local implementation review found zero actionable introduced findings. Backend filesystem validation and browser error allowances are unchanged. Focused evidence and review are under /home/alan/warehouse/merdeck-entry-polling/. Complete acceptance and publication are recorded below.

## Complete preparation

Clean implementation 0cb26f61a0719f764239ef11d2ade309420ac014 passed both frozen installs and the complete local ARM64/overlayfs check:ci gate with separate tmpfs refusal storage: frontend 622, backend 303, file 212, storage 6 and release/CI 52 cases. Both artifact browser suites passed 108 cases with 17 configuration-dependent skips each, in 3.1m and 3.4m. The disposable browser check verifies actual matching text/logo colors and text contrast 4.62/8.32 in light/dark themes, with zero unexpected errors and cleanup. Both desktop screenshots have been inspected. The 22 focused workspace tests, including existing save races, pass; four affected real browser cases have zero unexpected errors and confirmed cleanup. Header glyphs measure 20px; desktop controls share 32px heights and phone controls retain aligned 44px touch targets without overlap or clipping at 320/360/390px. Both phone screenshots have been inspected. Implementation review passes with zero actionable introduced findings. Evidence is under /home/alan/warehouse/merdeck-brand-wordmark/.

Both complete local gates for the original color-only candidate remain failed: the compiled file-operation audit observed HTTP 403 and then HTTP 409, with all operation assertions completed and cleanup confirmed. Each bundled suite passed 108 cases; each compiled suite passed 107 and failed one audit. After explicit approval, two deterministic regressions reproduced observer restarts during held entry mutations. The corrected candidate above passes the original complete gate with entry observers suspended until success/failure and existing active-read cancellation intact. Backend filesystem validation and browser error allowances were not changed. Original failure evidence remains under first-local.* and second-local.*; the earlier candidate hosted source evidence is preserved under previous-candidate-a4a92d5/. The resolved polling follow-up is taskist #62, linked to this implementation record.

[Exact implementation source verification](https://github.com/itxje/merdeck/actions/runs/36968557443) passed on Linux x64/ext4 with clean commit identity, distinct tmpfs refusal storage and physical source/bundle/compiled directory checks verified in downloaded reports.

## Final acceptance and delivery

The immutable annotated v0.19.27 tag resolves to 0cb26f61a0719f764239ef11d2ade309420ac014. [The tag workflow](https://github.com/itxje/merdeck/actions/runs/36969036332) passed complete Linux x64/ext4 native acceptance and same-run publication on attempt 1.

Downloaded reports confirm actual ext4 (0xef53, device 2049, descriptor mount 27 / 8:1) and distinct tmpfs refusal storage (0x1021994, device 26, descriptor mount 32 / 0:26). All twenty raw storage controls, file/HTTP checks, physical source/bundle/compiled directory adapters and the complete normal native gate passed with cleanup. Both artifact browser suites passed 108 cases with 17 configuration-dependent skips each, in 4.9m and 5.1m. Native acceptance is explicitly passed.

The publisher downloaded checked artifact 11211126714 from the same run and commit, with verified artifact digest sha256:bb248315d9a950ecd297e76f7638d707853be1828f9b1f7099601e6ab7fcf42c. No earlier artifact or duplicate pre-tag native run supplied publication.

[v0.19.27](https://github.com/itxje/merdeck/releases/tag/v0.19.27) is published. Both public attachments match GitHub digests and publisher provenance; SHA256SUMS validates the archive. The 97-file bundle reports version 0.19.27, tag v0.19.27, commit 0cb26f61a0719f764239ef11d2ade309420ac014, bundle target and Bun 1.4.2. Archive SHA-256: 46db1053f7fac7f046b592feb37d668ebb6325926e645f7c8d1ed0f3be3a9625.

Release notes describe brand colors, uniform header sizing and entry-polling coordination with the exact documented runtime/platform requirements, retaining the verified publisher marker and asset identities. Release evidence is under /home/alan/warehouse/merdeck-release-v0.19.27/. The existing release-generator wording follow-up remains taskist #61.

- complete: Published v0.19.27 from 0cb26f61a0719f764239ef11d2ade309420ac014 after focused regressions, complete clean local/source/native checks, same-run publication and public digest/checksum/build-identity verification. Header colors and sizes match; entry polling resumes after success or refusal.
