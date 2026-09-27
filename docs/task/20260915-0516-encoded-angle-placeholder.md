# 20260915-0516-encoded-angle-placeholder Render encoded angle placeholders safely

- **status**: completed
- **priority**: P1
- **owner**: root/encoded-angle-placeholder
- **createdAt**: 2026-09-15 05:16

## Description

Render the supplied Mermaid flowchart containing `mica-board-&lt;board&gt;` without changing source bytes in the editor, draft, save request, or saved file. Keep the preview policy's strict entity, markup, resource, and SVG-sanitization boundary.

## ActiveForm

Rendering the encoded angle placeholder safely.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- Investigation: `validateSource` rejects the supplied source at the entity boundary before `renderSource`, Mermaid parsing, SVG sanitization, or browser mounting. The existing inert raw-placeholder rule can prove a lowercase identifier such as `<board>` is non-element, non-custom-element text, but it does not reach encoded entities.
- Proposal: accept only a complete lowercase ASCII identifier encoded exactly as `&lt;identifier&gt;`, where the resulting raw placeholder passes the existing inert-placeholder predicate. Project that one token only for Mermaid rendering after validation; preserve the original source everywhere else. All other named/numeric entities, mixed-case and double encodings, tags, nested/malformed forms, resource/script values and event attributes remain refused.
- Risks: entity decoding is security-sensitive. Tests must cover exact source, invalid neighbors, render text, outbound requests, no script/event execution and byte-preserving save paths.
- Authorization: implementation explicitly authorized by the owner on 2026-09-15.
- RED: the exact fixture failed deterministically in `flowchart-policy.test.ts` because `validateSource` rejected `&lt;board&gt;` at the entity boundary before Mermaid, SVG sanitization, or browser mounting.
- GREEN/IMPROVE: only exact lowercase ASCII identifier tokens of the form `&lt;name&gt;` are projected. Validation proves the decoded candidate is already an inert non-element placeholder; Mermaid receives a private inert marker, and only generated SVG text nodes restore `<name>` before the existing sanitizer serializes it. Source, drafts and API payloads are untouched.
- Verification: pinned Bun 1.4.2; focused policy/renderer tests 274 passed; frontend coverage 487 passed (93.15% statements, 89.01% branches, 93.33% lines); frontend lint, typecheck and build passed; focused production browser case passed with visible `mica-board-<board>`, exact save request/disk/reload bytes, zero unexpected outbound requests/errors, no script/event nodes or execution; root `bun run check` passed with explicit `/tmp` overlay and `/dev/shm` tmpfs fixtures.
- Self-review: shared and TypeScript frontend review found no CRITICAL/HIGH findings. The SVG restoration is text-node-only and runs before the unchanged strict sanitizer; malformed, nested, numeric, mixed-case, double-encoded, tag-like, resource and event-attribute neighbors remain refused.
- Hosted release correction: Linux x64/native run 34951414554 attempt 1 at integrated candidate `8e0a389a508bfa52eb0bcd5305fa32694ba4e7c5` exposed a release-blocking split-text-node restoration gap. The original task remains completed; successor 20260915-0924-split-angle-marker owns the correction.

- complete: Pinned Bun focused, coverage, browser and root checks passed; incremental review found no actionable findings.
