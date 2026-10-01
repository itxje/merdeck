# 20261001-1514-file-sync-status Use distinct icons for file sync states

- **status**: completed
- **priority**: P2
- **owner**: sync-worker/session-20261001-1514
- **createdAt**: 2026-10-01 15:14

## Description

Use a shared circular-arrow family for project-file synchronization: green check for synchronized content, gray dot for pending edits, rotating arrows during saves, and a red exclamation for failed synchronization or required review. No click/hover text; retain accessible live descriptions.

## ActiveForm

The file sync status icons are verified and released.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

The explicit four-state implementation request approves this Full-tier presentation change up front. Synchronization concerns the service's original project files. Use existing draft/saving/warning state and whole-file dirty comparison, including sibling Markdown blocks and edits during a save. Keep the existing save operation and review flow. Existing warnings require attention instead of claiming synchronized content. Apply frontend and implementation-review baselines.

## Implementation and focused verification

A dedicated noninteractive status component uses circular arrows with check, dot and exclamation badges. Active saves take precedence; warnings and locked drafts require attention; the complete file's dirty comparison distinguishes pending content from synchronized content. Accessible live descriptions are visually hidden with no title or click action. Theme tokens distinguish green success and red attention, and reduced-motion users retain static arrows during synchronization.

The initial unit run failed because the new component did not exist. All eight state cases then passed with 100% component branch coverage, including sibling drafts, newer typing after acknowledgement, actual save refusal, every warning kind and locked drafts. The seventeen existing selected browser cases passed. New browser setup was corrected to select the phone Source tab and assert Tailwind's clip-path rather than its former clip rule; those setup failures remain recorded. The final new real-browser case passed with zero unexpected errors: actual 200 acknowledgement, held-response animation, reduced motion, actual external-write 409 refusal, original file-byte preservation, phone-visible badges, hidden accessible text and no hover/click tooltip. Screenshot review confirms light and dark phone presentation. Frontend lint/type checks pass with existing warnings; implementation review reports PASS with zero actionable findings.

At the focused checkpoint, complete clean-source local, hosted source and native release acceptance remained pending. Evidence is under `/home/alan/warehouse/merdeck-sync-states-20261001/`; browser evidence is in ignored `tmp/e2e-dPIhgo/`.

## Final acceptance and delivery

Clean source `df4deb5122a50dac76ca090e718ae36bb1bbfc6c` passed both frozen installs, complete local ARM64/overlayfs `check:ci` with separate tmpfs refusal storage and `git diff --check` in 5m49s. Frontend 620, backend 303, file 212, storage 6 and release/CI 52 cases passed. Both full artifact browser suites passed 108 cases with 17 configuration-dependent skips and clean service/fixture teardown. The new case exercises all four phone status shapes, actual file writes and refusal, animation and reduced motion, light/dark presentation and no hover/click text. Existing real save-race cases verify pending sibling edits and newer typing after acknowledgement.

[The exact source run](https://github.com/itxje/merdeck/actions/runs/36883730220) passed in 2m58s. [The v0.19.23 tag workflow](https://github.com/itxje/merdeck/actions/runs/36884607204) passed complete normal Linux x64/ext4 acceptance with distinct tmpfs refusal storage on attempt 1; publication was rerun alone on attempt 2 using the same checked artifact after a cancellation request canceled publication without stopping verification. Verification took 16m02s. Downloaded sanitized records confirm all twenty raw controls, file/HTTP checks, physical source/bundle/compiled directory adapters and both artifact browser suites. Native acceptance is explicitly passed. Publication uses the exact same-run checked artifact; no earlier artifact or extra manual native run was used.

[v0.19.23](https://github.com/itxje/merdeck/releases/tag/v0.19.23) contains non-cloud file synchronization icons with check, dot and exclamation badges, and rotating arrows during saves. Public assets match GitHub digests and publisher provenance; SHA256SUMS validates the archive. Its 97-file bundle reports version 0.19.23, tag v0.19.23, the exact commit and Bun 1.4.2. The annotated remote tag resolves to that source. Archive SHA-256: `0401162e36090503ceb32806e7a9aee058ba6951abd5490541d9f730650f4e87`. Evidence is under `/home/alan/warehouse/merdeck-sync-states-20261001/`.

All requested status changes are complete. CI cancellation and slow system dependency downloads are recorded as taskist #59 and #60. Native acceptance was not repeated. This delivery leaves running deployment configuration unchanged.

- complete: Delivered v0.19.23 after focused, complete local/source/native, same-artifact publication and public checksum/build-identity verification. CI follow-ups are taskist #59 and #60.
