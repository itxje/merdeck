# 20260926-1626-html-embedded-diagram-images Render bounded embedded diagram images in HTML previews

- **status**: in_progress
- **priority**: P1
- **owner**: release/session-20260926-v0.19.5
- **createdAt**: 2026-09-26 16:26

## Description

The SDCR200 and KM2210 HTML documents show no diagram images in Merdeck. Repair the HTML image projection while keeping existing navigation and execution boundaries. This is a Full-tier task because implementation, unit regression coverage and browser regression coverage span three files.

## ActiveForm

Implementation and focused validation complete; aggregate acceptance remains pending after an unrelated directory API HTTP 503.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- Confirmed against the current `projectHtml` implementation: all nine SVG data image sources are removed by the shared 2048-character URL limit.
- The HTML documents now place `nav` at body level, which matches `HtmlDocumentView` sidebar extraction. Their diagram sources and SVG exports remain intact.
- User confirmed that the failing viewer is Merdeck. The user explicitly approved the proposed viewer correction.
- Proposal: [embedded image admission](../plan/20260926-1626-html-embedded-diagram-images.md).

## Verification

- RED: the two added policy regressions failed against the original shared URL bound; seven existing cases passed.
- GREEN: all nine policy cases pass with coverage disabled for the focused run. The initial coverage-enabled focused command failed the global coverage threshold because unrelated modules were not exercised; the full suite remains the coverage gate.
- The actual `HtmlDocumentView` and worker load all five SDCR200 and four KM2210 embedded SVGs at 1920, 1440 and 390 pixels. Desktop navigation and main content both start at 28 pixels, with a 28-pixel column gap. No horizontal overflow or page errors were observed; editable Mermaid links open the expected file.
- Standalone HTML checks at 1440 and 390 pixels pass image decoding, local links, section anchors and no external requests. All nine Mermaid source hashes are unchanged.
- Local browser evidence and initial-layout screenshots: `tmp/html-images-evidence/`. The live service has not been updated.
- The first aggregate gate caught a missing explicit `node:buffer` import in the browser fixture. It is corrected; the changed files pass focused lint.

- The second aggregate attempt passed lint, types, 581 frontend cases, coverage and builds. Browser acceptance exposed a fixture exceeding the smoke service's explicit 8192-byte whole-file cap; the fixture now remains below that cap while exceeding the old 2048-character image URL limit.
- That attempt also observed an HTTP 503 from the directory API in the existing dirty external-deletion case, which does not exercise HTML projection. The unchanged deletion case and both HTML browser cases pass in a focused rerun with the same 8192-byte document limit (3/3; `tmp/html-images-focused.log`). The aggregate was repeated with the corrected fixture.

- The final executable browser run passes both HTML cases, including decoded SVG dimensions and inert script content. A different existing case (`UTF-8 source cap and authoritative Markdown file limit retain unsaved text`) encounters the same directory HTTP 503 while waiting for `full-file-cap.md`; it never exercises HTML projection. Aggregate acceptance remains unpassed. This unrelated directory failure is retained in `tmp/html-images-evidence/unrelated-directory-cap-error.md` rather than weakening the browser audit or changing unrelated directory code.

- The extracted architecture-independent bundle passes its full browser run: 94 passed, 17 configured skips, zero failures. Both HTML cases, the existing file-cap case and deletion cases pass. Its 96 checked resources, unchanged extraction and fixture/process cleanup pass (`tmp/html-images-bundle.log`).
- Final `git diff --check` passes. No source commit, remote publication, live deployment or native Linux x64/ext4 acceptance was performed. The task retains pending aggregate acceptance because the normal `check:ci` command did not finish successfully; individual stage success is not reported as a successful aggregate run.

## Review Summary

Reviewed image admission, its media callers, worker projection, image rendering, existing CSP and whole-document limits using the TypeScript frontend review policy. The larger bound applies only to Base64 image sources on `img`; executable SVG DOM and other URL capabilities remain unchanged.

| Severity | Count | Status |
|----------|-------|--------|
| CRITICAL | 0 | pass |
| HIGH | 0 | pass |
| MEDIUM | 0 | info |
| LOW | 0 | note |

Verdict: PASS.

- unclaim: Implementation, focused checks and extracted-bundle acceptance are complete; aggregate check:ci acceptance remains pending after an unrelated directory HTTP 503 in an existing Markdown case.

- Subsequent shared-reader verification (`tmp/reader-check.log`) passes all 582 frontend unit cases and both 96-case executable/bundle browser suites, including the image regression. Directory HTTP 503 did not recur. The aggregate's remaining limitation is final evidence export requiring clean source; the current image and reader implementation remains uncommitted.
