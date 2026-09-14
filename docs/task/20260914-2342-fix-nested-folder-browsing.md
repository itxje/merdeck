# 20260914-2342-fix-nested-folder-browsing Fix nested folder browsing

- **status**: completed
- **priority**: P1
- **owner**: Frontend maintainer
- **createdAt**: 2026-09-14 23:42

## Description

Repair project-folder browsing so a supported file in a normal parent/child/grandchild hierarchy remains reachable through the existing explorer folder-navigation interaction. Preserve scoped server-side paths, pagination, cursor recovery, retained drafts, and mobile drawer behavior.

## ActiveForm

Investigating nested project-folder browsing and adding regression coverage.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- The owner authorized this focused repair and its ordinary implementation choices on 2026-09-14.
- Investigation (2026-09-14): the directory endpoint, route search validation, and per-folder `useDirectory` traversal already preserve the configured project-root and depth boundaries. The existing desktop hierarchy test reaches one nested folder, and `directory.spec.ts` reaches a deep directory through the shared helper, but neither holds an active file-type search while entering a hierarchy.
- Root cause: the explorer treats a non-All file-type selection as a recursive search. Search responses intentionally include only files for a kind, so after entering a matching folder, the retained type search immediately replaces its direct child folders with recursive file results. The user can go Up but cannot continue through the intended folder affordance at the next level. This is a frontend interaction-state defect; no server limit or path policy change is needed.
- RED (2026-09-14): `folder navigation exits a recursive type search at every nested level` created parent/child/grandchild/example.mmd, started from a `.mmd` search result, and failed after entering `parent` because `child` was absent.
- GREEN (2026-09-14): entering a directory from recursive search clears both text and the selected type, restoring the immediate child-folder listing. The regression selects example.mmd after three folder transitions.
- Verification (2026-09-14): focused hierarchy browser run passed 2/2; affected directory, drawer, and hierarchy browser suites passed 10/10; frontend lint and typecheck passed; frontend coverage passed 473/473 (93.05% statements, 89.05% branches, 92.65% functions, 93.24% lines); `bun run check` passed with 255 backend and 473 frontend tests; `git diff --check` passed.
- Review (2026-09-14): local incremental review under the shared, TypeScript frontend, and TypeScript backend policies found no high-confidence introduced issue. The server-side project-root, path-depth, pagination, cursor, authentication, and external-change behavior are unchanged.

- complete: Focused 2/2 and affected 10/10 browser suites, frontend checks, full check, and whitespace check passed.
