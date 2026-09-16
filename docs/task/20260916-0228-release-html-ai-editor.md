# 20260916-0228-release-html-ai-editor Release HTML documents and the AI file editor

- **status**: pending
- **priority**: P1
- **owner**: (unassigned)
- **createdAt**: 2026-09-16 02:28

## Description

Publish the reviewed HTML document renderer, direct AI file editor with engine/model selection, and document table-header correction as minor release `v0.13.0`. Acceptance: the exact clean candidate passes local and hosted Linux x64/ext4 native gates before an annotated tag is created; the tag workflow publishes exactly the documented bundle and checksum assets; downloaded assets and embedded identity are independently verified; immutable evidence is recorded afterward.

## ActiveForm

Preparing the HTML and AI editor release.

## Dependencies

- **blocked by**: 20260916-0011-html-document-support, 20260916-0040-ai-editing-chat, 20260916-0227-table-header-borders
- **blocks**: (none)

## Notes

- Authorization (2026-09-16): the owner explicitly requested publication after the approved implementation is complete.
- The public HTML file kind and agent API require the next pre-1.0 minor version. No tag may be created before the exact candidate passes the repository's hosted native release gate.
