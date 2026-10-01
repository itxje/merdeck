# 20261001-1514-file-sync-status Use distinct icons for file sync states

- **status**: in_progress
- **priority**: P2
- **owner**: sync-worker/session-20261001-1514
- **createdAt**: 2026-10-01 15:14

## Description

Use a shared circular-arrow family for project-file synchronization: green check for synchronized content, gray dot for pending edits, rotating arrows during saves, and a red exclamation for failed synchronization or required review. No click/hover text; retain accessible live descriptions.

## ActiveForm

Implementing and verifying file sync state icons.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

The explicit four-state implementation request approves this Full-tier presentation change up front. Synchronization concerns the service's original project files. Use existing draft/saving/warning state and whole-file dirty comparison, including sibling Markdown blocks and edits during a save. Keep the existing save operation and review flow. Existing warnings require attention instead of claiming synchronized content. Apply frontend and implementation-review baselines.

## Implementation and focused verification

A dedicated noninteractive status component uses circular arrows with check, dot and exclamation badges. Active saves take precedence; warnings and locked drafts require attention; the complete file's dirty comparison distinguishes pending content from synchronized content. Accessible live descriptions are visually hidden with no title or click action. Theme tokens distinguish green success and red attention, and reduced-motion users retain static arrows during synchronization.

The initial unit run failed because the new component did not exist. All eight state cases then passed with 100% component branch coverage, including sibling drafts, newer typing after acknowledgement, actual save refusal, every warning kind and locked drafts. The seventeen existing selected browser cases passed. New browser setup was corrected to select the phone Source tab and assert Tailwind's clip-path rather than its former clip rule; those setup failures remain recorded. The final new real-browser case passed with zero unexpected errors: actual 200 acknowledgement, held-response animation, reduced motion, actual external-write 409 refusal, native file-byte preservation, phone-visible badges, hidden accessible text and no hover/click tooltip. Screenshot review confirms light and dark phone presentation. Frontend lint/type checks pass with existing warnings; implementation review reports PASS with zero actionable findings.

Complete clean-source local, hosted source and native release acceptance remain pending. Evidence is under `/home/alan/warehouse/merdeck-sync-states-20261001/`; browser evidence is in ignored `tmp/e2e-dPIhgo/`.
