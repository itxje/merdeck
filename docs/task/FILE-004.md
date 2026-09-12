# FILE-004 Skip compiled build output during discovery

- **status**: completed
- **priority**: P3
- **owner**: Backend maintainer
- **createdAt**: 2026-09-12

## Description

The project owner's deployment lists a workspace that holds several projects, and its tree came back truncated. Discovery already skips `node_modules`, `dist`, `build` and similar generated directories, but not a Rust `target` directory or a Python `__pycache__`, so build output competed with real diagrams for the entry budget. Acceptance: both directories are excluded from discovery and from direct access exactly as the existing entries are, with no other directory name affected.

## ActiveForm

Skipping compiled build output during discovery.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- Investigation (2026-09-12): counted the owner's configured root, excluding the names discovery already skips: 393,229 entries, of which three Rust `target` directories held about 67,000. That is a real share and the same class of generated output the existing list names, but it is not the reason that root truncates: three project directories hold about 297,000 entries between them, so no entry limit within the configured maximum could list it. The limit change and the root choice are recorded with the deployment, not here.
- Implementation (2026-09-12): `target` and `__pycache__` join the ignored directory set, which governs discovery, direct access and entry creation alike, so a diagram cannot be read from or written into either. The existing test that proves a generated directory stays out of the tree and out of reads now covers both names.
- Verification (2026-09-12, main checkout, pinned Bun 1.4.2, inside the project tmux session): `bun run check` passed with 203 backend tests across 9 files and 234 frontend tests across 19 files, and the complete browser suite passed 45 of 45.
