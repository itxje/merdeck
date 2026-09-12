# PREVIEW-008 Stop reading a colour declaration as an entity

- **status**: completed
- **priority**: P2
- **owner**: Frontend maintainer
- **createdAt**: 2026-09-12

## Description

The project owner brought an index diagram whose preview stayed empty even after its links were removed. Its class definitions end their declarations with an ordinary statement separator, `classDef entry fill:#e0f2fe,stroke:#0369a1,color:#0c4a6e;`, and the global check that refuses a numeric character reference matched `#0c4a6e;`, so a valid colour rejected the whole source. Acceptance: a colour declaration followed by a separator is accepted wherever the declaration itself is accepted; a numeric character reference in ordinary text stays refused; and no other check changes.

## ActiveForm

Separating a colour declaration from an entity.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- Investigation (2026-09-12): the rule was `#\w+;`, which cannot tell `&#60;` stripped of its ampersand from a hex colour that ends a statement. Mermaid accepts a trailing semicolon on `classDef` and `class` statements, and the owner's source uses it throughout, so every one of its class definitions tripped the rule. Reproduced against the real policy: the source was refused with the semicolons and accepted without them, with its links already removed in both cases.
- Implementation (2026-09-12): the rule now requires the reference to follow the start of a line or a character other than a colon, so a declaration value such as `fill:#0c4a6e;` is ordinary while `Value #60;img` stays refused. A character reference is text that follows other text; a colour follows its property.
- Verification (2026-09-12, main checkout, pinned Bun 1.4.2, inside the project tmux session): five new policy cases cover an index-shaped source whose class definition and assignment both end in a separator, a node style that ends in one, and refusals for a reference after a space, after a word and inside a label. Against the real renderer on a local build, the owner's source renders with its separators intact and no page errors. `bun run check` passed with 203 backend tests across 9 files and 223 frontend tests across 19 files, and the complete browser suite passed 44 of 44.
