# PREVIEW-007 Accept a title-only front matter

- **status**: completed
- **priority**: P3
- **owner**: Frontend maintainer
- **createdAt**: 2026-09-12

## Description

The project owner brought a state diagram whose preview stayed empty. Its only disabled construct was the leading front matter block that names the diagram, and the policy refuses every `---` block, because front matter can carry a `config` key with the same reach as a configuration directive. Acceptance: a source may open with a front matter block that carries exactly one `title` key; the title takes every check an ordinary label takes; any other key, a second block, a block that is not at the start and every other `---` line stay refused; and Mermaid still receives the original source, so the title reaches the diagram.

## ActiveForm

Accepting a title-only front matter.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- Investigation (2026-09-12): the global check refuses `---` at the start of any line, so the owner's state diagram was rejected before any family-specific handling. The rest of that source passes as it stands: with the three front matter lines removed it is accepted unchanged. Front matter is worth admitting narrowly rather than wholesale, because `config:` there sets the same values as the `%%{init}%%` directive the policy already refuses.
- Implementation (2026-09-12): a leading block of exactly `---`, one `title:` line and `---` is recognised before the global checks. Its title runs through the same unsupported-construct and disabled-word checks as any label, and the remaining source keeps every check it had, including the refusal of any other `---` line, so a second block, an extra key or a block further down still rejects the source. Mermaid receives the unmodified source and renders the title.
- Verification (2026-09-12, main checkout, pinned Bun 1.4.2, inside the project tmux session): eleven new policy cases cover an accepted title before a state diagram, before a flowchart that still reaches its fan-out and class handling, and an empty title, against refusals for a `config` key, a second key, a title carrying a comparison, a URL or a disabled word, two blocks, a block after the diagram and a bare `---`. Against the real renderer on a local build, the owner's state diagram renders 18 states and 43 labels with its title present and no page errors, and the same title renders above a flowchart. `bun run check` passed with 203 backend tests across 9 files and 219 frontend tests across 19 files, and the complete browser suite passed 44 of 44.
