# PREVIEW-005 Accept bounded node styling in the preview

- **status**: completed
- **priority**: P3
- **owner**: Frontend maintainer
- **createdAt**: 2026-09-12

## Description

The project owner brought a large flowchart whose preview was refused. It colours its groups with `style` statements, and the policy refused every `style` statement outright while admitting the same declarations through `classDef`, so the whole source was rejected. Acceptance: a `style` statement takes the same bounded declarations as a class definition, with the same identifiers, hex colours, widths and dash lengths; every other property, value form, selector and escape stays refused; `linkStyle`, configuration directives, entities and the remaining disabled grammar are unchanged; an author's colour actually reaches the rendered group; and the documentation matches.

## ActiveForm

Accepting bounded node styling in the preview.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- Investigation (2026-09-12): `maskFlowchart` in `web/src/features/preview/source-policy.ts` validated `classDef` and `class` statements and passed everything else to the global check, which refuses any remaining `style` word, so one `style` line rejected an entire diagram. The two statements carry identical declarations in Mermaid; only their selector differs, which made the refusal a gap rather than a boundary. Reproduced against the real policy with a reduction of the owner's source: it was refused with `style` present and accepted without it. The same reduction also showed three separate refusals in that source that are not this gap: the `%%{init: ...}%%` configuration directive, an `&lt;` entity inside a label, and a `<` inside an unquoted link label.
- Implementation (2026-09-12): the declaration validator now takes the statement shape, so `classDef <identifiers> <declarations>` and `style <identifiers> <declarations>` share one bounded property list, and a validated `style` statement is masked like a class definition. The closing guard also refuses a surviving `style` word, so an unvalidated one cannot reach Mermaid. Nothing else moved: `linkStyle`, spaced identifier lists, non-hex colours, widths above ten pixels and every other property still refuse the source.
- Verification (2026-09-12, main checkout, pinned Bun 1.4.2): `bun run check` passed inside the project tmux session with the supported overlay fixture parent under `/tmp` and the checkout `tmp/` as the refused parent, running 190 backend tests across 9 files and 207 frontend tests across 18 files, including twelve new policy cases: two accepted bounded `style` statements and ten refusals covering a named colour, `!important`, a resource URL, an unbounded property, an excessive width, a trailing token, a missing declaration, a spaced identifier list, a smuggled second statement and `linkStyle`. Against the real renderer on a local build, the reduced source rendered with the author's group colour applied exactly: the styled group's rectangle carried `rgb(245, 245, 245)` with `rgb(51, 51, 51)` at `3px`, an unstyled group kept the neutral cluster tokens `rgb(250, 250, 250)` and `rgb(212, 212, 212)`, and a class-styled node kept `rgb(255, 248, 225)`. No page or service errors appeared. The full browser suite passed 42 of 42 in 1.9 minutes on the supported overlay fixture parent.
