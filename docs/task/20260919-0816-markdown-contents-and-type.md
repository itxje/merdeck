# 20260919-0816-markdown-contents-and-type Give the Markdown preview a contents list and larger type

- **status**: completed
- **priority**: P1
- **owner**: l1/session-20260918-1627
- **createdAt**: 2026-09-19 08:16

## Description

The HTML preview lays a sticky contents list beside one reading measure and sets its own 17px type, but the
Markdown preview had neither: it rendered a single column with the shell's smaller base size, and offered no
way to jump between sections even though it already slugs every heading and resolves in-document anchors.

Deliver:
1. A contents list built from the document's own headings down to the third level, sharing the existing
   heading anchors, shown only when the document has more than one listed heading.
2. Document type that matches the HTML preview: a 17px base, headings scaled with the document rather than the
   root size, and code at a readable fixed size.

Acceptance: `bun run check` passes and the browser Markdown cases still pass.

## ActiveForm

Giving the Markdown preview a contents list and larger type.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- The document view already collected headings and generated GitHub-style slugs for anchor links, so the
  contents list reuses `headingSlugs` and the existing `headingMapRef` scroll target.
- Two browser assertions needed adjusting for the new layout, both reflecting behavior rather than masking a
  regression: the sixth heading level now sits above the 17px body instead of below the old inherited size,
  and the taller document leaves the second diagram outside the viewport, so the case reaches it before
  counting both rendered diagrams. Diagrams render as they approach the viewport by design.

- complete: Delivered; bun run check and the 73-case browser suite passed.
