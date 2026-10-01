# 20261001-1927-remove-preview-heading Remove the redundant preview heading

- **status**: in_progress
- **priority**: P2
- **owner**: preview-worker/session-20261001-1927
- **createdAt**: 2026-10-01 19:27

## Description

Remove the Preview / Live preview heading row shown in the supplied screenshot. Retain accessible render status, the existing visible error banner, loading/empty canvas messages and all diagram interactions. Deliver the approved presentation change as v0.19.26 using the established native tag and public asset verification workflow.

## ActiveForm

Removing the redundant preview heading and verifying render feedback.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

Full tier: the preview component, styles and existing tests span several files. The explicit conditional removal request approves removing a row with no controls after checking its role. It contains a static title and render-status text; errors already have a separate alert and an empty/loading canvas already has its own message. Keep the live status as visually hidden text so assistive technology and settled-render checks retain useful state without consuming a row. The prior publication request continues to authorize delivery of these interface refinements.

Update the existing render/error case to demonstrate absence of the heading and retained accessible status before implementation. Adapt existing browser readiness checks and warning contrast cases to the removed visible row. Run focused preview cases and frontend lint/types, commit and push the reviewed implementation, then run complete clean-source local and exact hosted source verification. Inspect real desktop/phone screenshots. Publish v0.19.26 only after its immutable tag passes complete Linux x64/ext4 native acceptance; verify same-run publication, public digests/checksum and bundle/tag/commit identity.

## Implementation and focused verification

Remove the heading wrapper and static title, and keep the existing render status as sr-only text. Remove its unused live/stale color rules. The visible error alert, empty/loading canvas content, footer, zoom/pan and editing/link handling are unchanged. Existing browser readiness and stale-state assertions now check status presence instead of visibility; the light/dark contrast cases verify the canvas starts at the pane top and the visible error banner retains sufficient contrast.

The updated existing render/error case first failed on the heading assertion, then all six preview cases passed. Frontend lint/types pass with the existing four warnings. Initial local diff review found zero actionable introduced issues. Complete clean-source local/source gates, real screenshot inspection and native release/public acceptance remain pending. Evidence is under /home/alan/warehouse/merdeck-preview-heading/.

## Browser selector correction

The initial complete local browser checks exposed ambiguity in the new status locator: Playwright's default substring match for an empty accessible name also matched the Zoom level output, which has an implicit status role. The light/dark cases failed before their layout and warning assertions. Add exact: true to select the unnamed render status. The initial browser results remain failed; complete clean-source verification will run again at the corrected commit after the current checks finish cleanup. The application change is unchanged.
