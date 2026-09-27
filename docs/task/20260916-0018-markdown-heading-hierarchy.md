# 20260916-0018-markdown-heading-hierarchy Restore Markdown heading hierarchy

- **status**: completed
- **priority**: P2
- **owner**: markdown-heading-20260916
- **createdAt**: 2026-09-16 00:18

## Description

Restore a visible typographic hierarchy for rendered Markdown headings. Tailwind's base reset makes headings inherit body font size and weight, while the document stylesheet currently defines only heading margins and line height. Add explicit theme-compatible heading sizes and weights for `h1` through `h6`, and retain a production-browser assertion that headings are visually distinct from paragraph text.

## ActiveForm

Restoring rendered Markdown heading hierarchy.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- Investigation (2026-09-16): `DocumentView` emits semantic heading elements correctly. The regression is confined to `web/src/index.css`: `.document-view h1, h2, h3` sets only line height and margins, while `h4` through `h6` have no document-specific rules. The smallest durable correction is CSS typography plus a computed-style assertion in the existing complete-Markdown browser case.
- Approval: the owner explicitly requested that the current rendering problem be handled on 2026-09-16.
- RED: the production Chromium case failed because the six heading levels did not all have a larger size and stronger weight than paragraph text.
- GREEN: `h1` through `h6` now use a descending 1.75rem-to-0.875rem scale and 600-to-700 weights through the existing document/theme stylesheet. The same production Chromium case passed in light/dark and desktop/390px paths with zero unexpected browser errors.
- Verification: Bun 1.4.2 and Node 24.20.0; focused production browser 1/1 passed; `bun run check` passed 258 backend and 528 frontend tests, lint (only the established sanitized-SVG warning), typecheck, coverage and production build; `git diff --check` passed. Incremental PMA shared/frontend review found no CRITICAL/HIGH findings.

- complete: Focused production browser and complete local repository checks passed.
