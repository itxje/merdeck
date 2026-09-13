# 20260913-1626-directory-browsing-contract Directory browsing investigation and contract

- **status**: completed
- **priority**: P1
- **owner**: directory-contract/20260913-1626
- **createdAt**: 2026-09-13 16:26

## Description

Investigate existing directory, document, and mutation call chains and propose a complete bounded per-directory pagination contract. Documentation-only scope: task, plan, decisions, and a concise changelog entry. Preserve existing compatibility, storage, and preview behavior.

## ActiveForm

Investigating directory browsing and specifying the independent backend and frontend contract.

## Dependencies

- **blocked by**: (none)
- **blocks**: Directory pagination implementation and integrated acceptance.

## Notes

- Full tier. The owner authorized proposal and implementation on 2026-09-13; this bounded task owns investigation and proposal only.
- Initial branch and worktree verification passed; the local upstream commit is already included. No merge required.

- 2026-09-13 16:33 UTC: completed actual-code investigation and the full [feature plan](../plan/20260913-1628-directory-navigation-pagination.md), including the exhaustive operation-depth audit, independent backend/frontend contract, resource/cleanup bounds, risks and acceptance phases.
- Applied existing authorization only after the concrete proposal was written; overall plan remains implementing. Added the [scoped routing decision](../decisions/20260913-1628-directory-contract-routing.md). No executable, configuration, README, frontend or design asset was changed.

## Verification and self-review

- Documentation integrity: all 26 local links in the three new documents resolve; both indexes preserve every existing entry byte-for-byte and append one new entry. PLAN-026 and PREVIEW-011 remain byte-identical to the starting commit. Exact paths, schema discriminants, restart error names, bounds, owner, relatedTask and plan markers were cross-checked.
- The first link check found an incorrect `.ts` suffix on the Workspace source reference; it was corrected to `.tsx` and the full documentation check passed. No source file was changed.
- `git diff --check` passed. The changed-path check allows exactly the six intended documentation files. Evidence: `tmp/directory-contract-20260913-1626/docs-validation.json` and `tmp/directory-contract-20260913-1626/diff-check.txt` (ignored, local-only).
- Self-review applied the shared review policy and TypeScript backend trust-boundary, contract, resource and lifecycle checks to this documentation proposal. The review checked single-use cursor races, pending-entry accounting, root/ancestor checks, mutation invalidation, deep operation consistency, deferred UI semantics, scoped compatibility and honest acceptance claims. Corrected the transient API-query versus browser-navigation URL wording and clarified close's lack of filesystem resolution.
- Review verdict: PASS; CRITICAL 0, HIGH 0, MEDIUM 0, LOW 0 remaining actionable documentation findings. Metadata freshness/external actor windows, bounded growing-prefix move refusal and cursor restart costs remain explicit design limitations, with implementation acceptance outstanding.
- Executable, browser, preview, storage and native gates were not run: this is documentation-only investigation/proposal. No implementation success or prototype approval is asserted.

- complete: Investigation and proposed contract completed; documentation link/schema/scope checks and whitespace review passed. Overall feature plan remains implementing pending backend, frontend and integrated acceptance.
