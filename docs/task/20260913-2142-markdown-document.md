# 20260913-2142-markdown-document Render whole Markdown documents

- **status**: completed
- **priority**: P2
- **owner**: markdown-document-20260915
- **createdAt**: 2026-09-13 21:42

## Description

Opening a Markdown file shows only its Mermaid diagrams, one at a time, and a Markdown file without a selectable diagram shows an empty state. The owner asked for the whole document to render. Acceptance, as proposed in [the plan](../plan/20260913-2142-markdown-document.md): Markdown documents render read-only with their diagrams in place while per-block editing and saving stay unchanged; the document API carries the complete text of Markdown files; prose becomes React elements without any HTML built from file content; links follow an allowlist and project documents open in the workspace; images and raw HTML are neither loaded nor rendered; the single-diagram canvas remains available; and the evidence listed in the plan is produced.

## ActiveForm

Rendering whole Markdown documents.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- Investigation (2026-09-13): the service parses Markdown only to locate top-level Mermaid fences and never returns the complete text; README and the architecture state that surrounding Markdown is never rendered; the web application has no Markdown renderer, although the needed parser packages are already in its lockfile; the preview is a single-diagram canvas keyed by file and block. Details are in the plan's context.
- Proposal: recorded in [the plan](../plan/20260913-2142-markdown-document.md), awaiting approval.

- complete: Focused service, decoder and document-renderer tests passed; frontend production build passed. Native Linux x64/ext4 acceptance was not available in this isolated worktree.
