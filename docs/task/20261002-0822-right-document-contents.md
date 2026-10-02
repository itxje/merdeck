# 20261002-0822-right-document-contents Remove the document filename row and move contents right

- **status**: completed
- **priority**: P2
- **owner**: reader-right/session-20261002-0822
- **createdAt**: 2026-10-02 08:19

## Description

Remove the repeated document filename row, lift the reading body, and place the contents on the right for both Markdown and HTML. Keep resize, collapse, independent scrolling, current-section tracking and narrow-screen navigation usable. Deliver through the established release workflow.

## ActiveForm

Moving document contents right and verifying the reclaimed reading space.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

Full tier: shared reader markup, layout, resize interaction and related tests. The explicit requested changes provide upfront approval; established release authorization covers delivery. Evidence belongs under /home/alan/warehouse/merdeck-reader-right/ and /home/alan/warehouse/merdeck-release-v0.19.30/. Canonical acceptance requires the normal complete Linux x64/ext4 check:ci --native with distinct refusal storage and same-run publication. Deferred taskist #64 remains outside this presentation change; preserve verification limits and error auditing.

## Implementation and local acceptance

Removed the repeated filename and its full-width row. The article now starts at the reader top, reclaiming 48px on desktop with visible contents. The contents header/list occupy a right column and its separator spans the frame. Moving the separator left grows the rail, including ArrowLeft; ArrowRight shrinks it. Width persistence, bounds and double-click reset remain unchanged. Collapsed/narrow views offer an icon-only top-right contents button with prose clearance; the narrow drawer opens on the right. Documents without contents reserve no toolbar space.

Two existing unit assertions and two real-browser cases first failed on filename absence. After implementation all 43 affected unit cases and 11 affected production browser cases pass, including actual geometry, directional drag/keys, restored widths, independent scrolling, collapse state, current-section highlights, drawer focus return and table scrolling. Browser auditing reports zero unexpected errors and cleanup. The initial full frontend attempt failed on JSX indentation; the corrected final run passes both frozen installs, lint/types, all 622 frontend cases with coverage, production build and git diff --check. Four existing unrelated lint warnings remain. Inspected desktop, collapsed and phone screenshots pass; implementation review has zero actionable introduced findings. Evidence is under /home/alan/warehouse/merdeck-reader-right/ and tmp/e2e-Tddrf9/. Exact source/native and public delivery checks remain pending.

## Native failure and phone assertion correction

The first implementation 976fe2ec488d6df7b5209944b691536d1bb5510d passed exact [source verification](https://github.com/itxje/merdeck/actions/runs/36983657326). Its annotated v0.19.30 tag failed [native acceptance](https://github.com/itxje/merdeck/actions/runs/36984097855): both bundle and compiled browser suites passed 107 cases with 17 skips but failed the same old markdown-view-switch phone case. That case waited for the removed document toolbar and timed out at 45 seconds. The failure is an unsynchronized layout assertion; all requested reader cases passed in both suites with zero unexpected errors. Artifact processes/fixtures cleaned up and publication was skipped. Reports and failure logs are preserved under /home/alan/warehouse/merdeck-release-v0.19.30/. The failed tag remains unchanged and unpublished.

Correct the existing phone assertion to require no document toolbar/filename and require the article to start directly beneath the application header. Capture the no-contents phone layout. Search all frontend tests for the removed toolbar/title and separator selectors; this is the only remaining obsolete geometry assertion. The production implementation and verification time limits/error auditing remain unchanged. Expand local affected-browser verification to 12 cases, run the final frontend gate and exact source/native delivery again for a new v0.19.31 candidate. Successful proof belongs under /home/alan/warehouse/merdeck-release-v0.19.31/.

## Corrected local preparation

All 12 expanded production browser cases pass with zero unexpected errors and confirmed cleanup. The inspected no-contents phone screenshot in tmp/e2e-8PESu1/ shows the article directly below the application header, with no repeated filename or contents toolbar. Both frozen installs, frontend lint/types, all 622 frontend cases with coverage, build and whitespace checks pass after the test correction. The production layout is unchanged, and correction review has zero actionable introduced findings. Exact new-candidate source/native and v0.19.31 public delivery checks remain pending.

## Complete preparation and delivery

Implementation 919a40d705329b135b3bbeed6f20ed770da28429 passed both local frozen installs, frontend lint/types, all 622 frontend cases with coverage, production build and whitespace checks. All 43 focused unit cases and 12 affected real-browser cases pass after initial failures on the repeated filename. The initial formatting-only frontend failure and the failed v0.19.30 native gate remain preserved. The old phone-mode test still expected the removed filename toolbar; its corrected assertion now requires no toolbar and places the article directly beneath the application header. The production reader implementation is unchanged by that test correction. Inspected desktop, collapsed and phone screenshots show the raised article, right contents and unobstructed compact trigger. Browser cases verify right-column/drawer geometry, spatial drag and keyboard resizing, restored width, independent scrolling, collapse, current-section navigation, focus return and table overflow. Implementation review has zero actionable introduced findings. Local evidence is under /home/alan/warehouse/merdeck-reader-right/ and the browser evidence directories recorded above.

[Exact source verification](https://github.com/itxje/merdeck/actions/runs/36985248666) passed on the clean candidate with Linux x64/ext4, distinct tmpfs refusal storage and physical source/bundle/compiled adapters verified in downloaded reports.

The immutable annotated v0.19.31 tag resolves to 919a40d705329b135b3bbeed6f20ed770da28429. [The tag workflow](https://github.com/itxje/merdeck/actions/runs/36985695811) passed the complete normal Linux x64/ext4 check:ci --native gate and same-run publication on attempt 1. Downloaded reports verify clean source identity, matching held-descriptor ext4 provenance (0xef53), distinct tmpfs refusal storage (0x1021994), all twenty raw storage controls, file/HTTP checks and physical source/bundle/compiled adapters with cleanup. Both artifact browser suites passed 108 cases with 17 configuration-dependent skips each, in 5.0m and 5.1m. Native acceptance is explicitly passed.

The publisher downloaded checked artifact 11217447307 from the same run and commit, with verified artifact digest sha256:01dd7fb7a2a7ffb8dc4742e49a659544dcaab1d4f4b68376066eb4df6f1134e1.

[v0.19.31](https://github.com/itxje/merdeck/releases/tag/v0.19.31) is published. Both public attachments match GitHub digests and publisher provenance; SHA256SUMS validates the archive. The 97-file bundle reports version 0.19.31, tag v0.19.31, commit 919a40d705329b135b3bbeed6f20ed770da28429, bundle target and Bun 1.4.2. Archive SHA-256: 7a91d43a80d579657b2bcc8227d36cb17fc8d180889c76149bc22e2899a98ce5.

Release notes describe the removed filename row, raised body and right-hand contents with the documented runtime/platform requirements, retaining the publisher marker and both asset identities. Release evidence is under /home/alan/warehouse/merdeck-release-v0.19.31/. The failed v0.19.30 tag remains at 976fe2ec488d6df7b5209944b691536d1bb5510d and was not published or moved. [Its failed native workflow](https://github.com/itxje/merdeck/actions/runs/36984097855) remains recorded; this release uses a new immutable tag and exact candidate. Existing deferred taskist #61 (generated support wording), #64 (local ARM64 compiled-browser budget) and #65 (narrow source heading) remain outside this layout change.

- complete: Published v0.19.31 from 919a40d705329b135b3bbeed6f20ed770da28429 after corrected local checks, complete source/native gates, same-run publication and public artifact verification. The failed v0.19.30 tag and reports remain unchanged and unpublished.
